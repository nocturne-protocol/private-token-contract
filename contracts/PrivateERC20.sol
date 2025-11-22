// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IexecLibOrders_v5} from "./libraries/IexecLibOrders_v5.sol";
import {IPocoOApp} from "./interfaces/IPocoOApp.sol";
import {IPrivateERC20} from "./interfaces/IPrivateERC20.sol";
import {IPoco} from "./interfaces/IPoco.sol";

/**
 * @title PrivateERC20
 * @dev ERC20-like token with encrypted balances for privacy
 * Designed to work with iExec TEE for off-chain decryption
 * All state is encrypted with a single public key
 */
contract PrivateERC20 is IPrivateERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    // Public key used to encrypt all balances (stored as bytes for flexibility)
    bytes public encryptionPublicKey;
    
    // Encrypted balances mapping: address => encrypted balance
    mapping(address => bytes) public encryptedBalances;
    
    // Pre-signed orders for iExec matchOrders
    IexecLibOrders_v5.AppOrder public appOrder;
    IexecLibOrders_v5.WorkerpoolOrder public workerpoolOrder;
    IexecLibOrders_v5.DatasetOrder public datasetOrder; // Will be empty but needed for matchOrders
    
    // PocoOApp router address (for cross-chain calls)
    address public pocoOAppRouter;
    // Poco contract address (for direct calls on Arbitrum)
    address public pocoAddress;
    // Flag to determine if we're on Arbitrum (direct call) or need to route
    bool public isArbitrum;
    // LayerZero options for cross-chain calls
    bytes public lzOptions;
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        bytes memory _encryptionPublicKey,
        address _pocoOAppRouter,
        address _pocoAddress,
        bool _isArbitrum,
        bytes memory _lzOptions
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        encryptionPublicKey = _encryptionPublicKey;
        totalSupply = 0;
        pocoOAppRouter = _pocoOAppRouter;
        pocoAddress = _pocoAddress;
        isArbitrum = _isArbitrum;
        lzOptions = _lzOptions;
    }
    
    /**
     * @dev Store pre-signed orders for iExec matchOrders
     * 
     * These orders should be signed off-chain by the respective owners:
     * - AppOrder: Signed by the app owner (for the TEE computation app)
     * - WorkerpoolOrder: Signed by the workerpool owner (for TEE execution)
     * - DatasetOrder: Can be empty (dataset = address(0)) if no dataset is required
     * 
     * The RequestOrder will be created on-chain dynamically in the transfer() function
     * with the requester set to msg.sender and params containing transfer details.
     * 
     * Important: Ensure all orders are compatible:
     * - Same category and trust level
     * - Compatible tags (TEE requirements)
     * - Matching restrictions
     * - Valid signatures in the 'sign' field
     * 
     * @param _appOrder Pre-signed app order from app owner
     * @param _workerpoolOrder Pre-signed workerpool order from workerpool owner
     * @param _datasetOrder Dataset order (use empty order with dataset=address(0) if no dataset)
     */
    function storeOrders(
        IexecLibOrders_v5.AppOrder calldata _appOrder,
        IexecLibOrders_v5.WorkerpoolOrder calldata _workerpoolOrder,
        IexecLibOrders_v5.DatasetOrder calldata _datasetOrder
    ) external {
        require(_appOrder.app != address(0), "App address cannot be zero");
        require(_workerpoolOrder.workerpool != address(0), "Workerpool address cannot be zero");
        require(_appOrder.volume > 0, "App order volume must be > 0");
        require(_workerpoolOrder.volume > 0, "Workerpool order volume must be > 0");
        
        appOrder = _appOrder;
        workerpoolOrder = _workerpoolOrder;
        datasetOrder = _datasetOrder;
        
        emit OrdersStored(msg.sender);
    }
    
    /**
     * @dev Update PocoOApp router address
     * @param _pocoOAppRouter New router address
     */
    function setPocoOAppRouter(address _pocoOAppRouter) external {
        require(_pocoOAppRouter != address(0), "Invalid router address");
        pocoOAppRouter = _pocoOAppRouter;
    }
    
    /**
     * @dev Update Poco contract address
     * @param _pocoAddress New Poco address
     */
    function setPocoAddress(address _pocoAddress) external {
        require(_pocoAddress != address(0), "Invalid Poco address");
        pocoAddress = _pocoAddress;
    }
    
    /**
     * @dev Update LayerZero options
     * @param _lzOptions New LZ options
     */
    function setLzOptions(bytes calldata _lzOptions) external {
        lzOptions = _lzOptions;
    }
    
    /**
     * @dev Mint tokens with encrypted amount
     * @param to Address to mint tokens to
     * @param encryptedAmount Encrypted amount to mint
     */
    function mint(address to, bytes calldata encryptedAmount) external {
        require(to != address(0), "Cannot mint to zero address");
        require(encryptedAmount.length > 0, "Invalid encrypted amount");
        
        // Store the encrypted balance (encrypted with the contract's public key)
        encryptedBalances[to] = encryptedAmount;
        
        emit Mint(to, encryptedAmount);
    }
    
    /**
     * @dev Request a transfer operation to be processed by TEE
     * @param to Recipient address
     * @param encryptedAmount Encrypted amount to transfer
     */
    function transfer(address to, bytes calldata encryptedAmount) external payable {
        require(to != address(0), "Cannot transfer to zero address");
        require(to != msg.sender, "Cannot transfer to self");
        require(encryptedAmount.length > 0, "Invalid encrypted amount");
        require(appOrder.app != address(0), "Orders not configured");
        
        // Create request order on-chain
        IexecLibOrders_v5.RequestOrder memory requestOrder = IexecLibOrders_v5.RequestOrder({
            app: appOrder.app,
            appmaxprice: appOrder.appprice,
            dataset: address(0), // No dataset
            datasetmaxprice: 0,
            workerpool: workerpoolOrder.workerpool,
            workerpoolmaxprice: workerpoolOrder.workerpoolprice,
            requester: address(this),
            volume: 1, // Single task
            tag: appOrder.tag,
            category: workerpoolOrder.category,
            trust: workerpoolOrder.trust,
            beneficiary: address(this), // Callback to this contract
            callback: address(this),
            params: _buildTransferParams(msg.sender, to, encryptedAmount),
            salt: keccak256(abi.encodePacked(msg.sender, to, block.timestamp)),
            sign: "" // Empty - will be pre-signed via manageRequestOrder
        });
        
        // Call matchOrders via PocoOApp router
        bytes32 dealId = _callMatchOrders(requestOrder);
        emit TransferRequested(msg.sender, to, encryptedAmount,dealId);
    }
    
    /**
     * @dev Build params string for transfer request
     * @param from Sender address
     * @param to Recipient address
     * @param encryptedAmount Encrypted amount
     * @return Space-separated params string: encrypteddata sender recipient
     */
    function _buildTransferParams(
        address from,
        address to,
        bytes calldata encryptedAmount
    ) private pure returns (string memory) {
        // Build space-separated args for the iExec app
        // Format: encrypteddata sender recipient
        // Using string.concat for cleaner and safer concatenation
        return string.concat(
            _bytesToHexString(encryptedAmount),
            ' ',
            _addressToString(from),
            ' ',
            _addressToString(to)
        );
    }
    
    /**
     * @dev Call matchOrders via PocoOApp router or directly
     * @param requestOrder The request order
     * @return dealId The deal ID returned from matchOrders
     */
    function _callMatchOrders(
        IexecLibOrders_v5.RequestOrder memory requestOrder
    ) private returns (bytes32) {
        if (isArbitrum) {
            // On Arbitrum, call Poco directly
            require(pocoAddress != address(0), "Poco address not set");
            
            // Pre-sign the request order using manageRequestOrder
            // This allows the contract to be the requester without needing an off-chain signature
            IexecLibOrders_v5.RequestOrderOperation memory requestOrderOperation = 
                IexecLibOrders_v5.RequestOrderOperation({
                    order: requestOrder,
                    operation: IexecLibOrders_v5.OrderOperationEnum.SIGN,
                    sign: new bytes(0)
                });
            
            IPoco(pocoAddress).manageRequestOrder(requestOrderOperation);
            
            // Now call matchOrders with the pre-signed request order
            bytes32 dealId = IPoco(pocoAddress).matchOrders(
                appOrder,
                datasetOrder,
                workerpoolOrder,
                requestOrder
            );
            
            return dealId;
        } else {
            // Route the call through PocoOApp to Arbitrum via LayerZero
            require(pocoOAppRouter != address(0), "PocoOApp router not set");
            
            // The matchOrders function selector from IexecPoco1Facet
            bytes4 functionSelector = 0x156194d4; // matchOrders selector
            
            // Encode the full function call with all parameters
            bytes memory payload = abi.encode(
                appOrder,
                datasetOrder,
                workerpoolOrder,
                requestOrder
            );
            
            // Forward the call via LayerZero
            uint64 nonce = IPocoOApp(pocoOAppRouter).routeCall{value: msg.value}(
                functionSelector,
                payload,
                msg.sender, // Refund address for excess LayerZero fees
                lzOptions
            );
            
            // Note: We can't get the real dealId directly from cross-chain call
            // The actual dealId will be available in the CrossChainDealCreated event on Arbitrum
            // For tracking purposes, we return a deterministic placeholder based on nonce
            return keccak256(abi.encodePacked(msg.sender, block.timestamp, nonce));
        }
    }
    
    /**
     * @dev Helper function to convert address to string
     */
    function _addressToString(address _addr) private pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
    
    /**
     * @dev Helper function to convert bytes to hex string
     */
    function _bytesToHexString(bytes calldata _bytes) private pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(2 + _bytes.length * 2);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < _bytes.length; i++) {
            str[2 + i * 2] = alphabet[uint8(_bytes[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(_bytes[i] & 0x0f)];
        }
        return string(str);
    }
    
    /**
     * @dev Update encrypted balances for sender and receiver
     * This function should only be called by the iExec TEE enclave
     * after off-chain decryption and computation of transfer
     * All amounts are encrypted with the contract's public key
     * @param sender Sender address
     * @param receiver Receiver address
     * @param senderNewBalance New encrypted balance for sender
     * @param receiverNewBalance New encrypted balance for receiver
     */
    function updateBalance(
        address sender,
        address receiver,
        bytes calldata senderNewBalance,
        bytes calldata receiverNewBalance
    ) external {
        require(sender != address(0), "Invalid sender");
        require(receiver != address(0), "Invalid receiver");
        require(senderNewBalance.length > 0, "Invalid sender balance");
        require(receiverNewBalance.length > 0, "Invalid receiver balance");
        
        encryptedBalances[sender] = senderNewBalance;
        encryptedBalances[receiver] = receiverNewBalance;
        
        emit BalanceUpdate(sender, senderNewBalance);
        emit BalanceUpdate(receiver, receiverNewBalance);
    }
    
    /**
     * @dev Get encrypted balance of an account
     * @param account Account to query
     * @return Encrypted balance
     */
    function balanceOf(address account) external view returns (bytes memory) {
        return encryptedBalances[account];
    }
}
