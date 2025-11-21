// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title PrivateERC20
 * @dev ERC20-like token with encrypted balances for privacy
 * Designed to work with iExec TEE for off-chain decryption
 */
contract PrivateERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    
    // Encrypted balances mapping: address => encrypted balance
    mapping(address => bytes) public encryptedBalances;
    
    // Total supply (can be public or encrypted based on requirements)
    uint256 public totalSupply;
    
    // Owner/admin of the contract
    address public owner;
    
    // TEE oracle address for balance updates
    address public teeOracle;
    
    // Mapping to track pending operations
    mapping(bytes32 => bool) public pendingOperations;
    
    // Events
    event Mint(address indexed to, bytes encryptedAmount);
    event Transfer(address indexed from, address indexed to, bytes encryptedAmount);
    event BalanceUpdate(address indexed account, bytes newEncryptedBalance);
    event TransferRequested(
        bytes32 indexed operationId,
        address indexed from,
        address indexed to,
        bytes encryptedAmount
    );
    event BalancesUpdated(
        bytes32 indexed operationId,
        address[] accounts,
        bytes[] newBalances
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier onlyTEE() {
        require(msg.sender == teeOracle, "Only TEE can call this function");
        _;
    }
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _teeOracle
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        owner = msg.sender;
        teeOracle = _teeOracle;
        totalSupply = 0;
    }
    
    /**
     * @dev Mint tokens with encrypted amount
     * @param to Address to mint tokens to
     * @param encryptedAmount Encrypted amount to mint
     */
    function mint(address to, bytes calldata encryptedAmount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(encryptedAmount.length > 0, "Invalid encrypted amount");
        
        // Store the encrypted balance (this will need to be updated by TEE)
        encryptedBalances[to] = encryptedAmount;
        
        emit Mint(to, encryptedAmount);
    }
    
    /**
     * @dev Request a transfer operation to be processed by TEE
     * @param to Recipient address
     * @param encryptedAmount Encrypted amount to transfer
     */
    function transfer(address to, bytes calldata encryptedAmount) external {
        require(to != address(0), "Cannot transfer to zero address");
        require(to != msg.sender, "Cannot transfer to self");
        require(encryptedAmount.length > 0, "Invalid encrypted amount");
        
        bytes32 operationId = keccak256(abi.encodePacked(
            msg.sender,
            to,
            encryptedAmount,
            block.timestamp,
            block.number
        ));
        
        pendingOperations[operationId] = true;
        
        emit TransferRequested(operationId, msg.sender, to, encryptedAmount);
        emit Transfer(msg.sender, to, encryptedAmount);
    }
    
    /**
     * @dev Update encrypted balance for an account
     * This function should only be called by the iExec TEE enclave
     * after off-chain decryption and computation
     * @param account Account to update
     * @param newEncryptedBalance New encrypted balance
     */
    function updateBalance(address account, bytes calldata newEncryptedBalance) external onlyTEE {
        require(account != address(0), "Invalid account");
        require(newEncryptedBalance.length > 0, "Invalid encrypted balance");
        
        encryptedBalances[account] = newEncryptedBalance;
        
        emit BalanceUpdate(account, newEncryptedBalance);
    }
    
    /**
     * @dev Batch update balances (useful for transfer operations)
     * Called by iExec TEE after processing transfer requests
     * @param operationId The operation ID that was processed
     * @param accounts Array of accounts to update
     * @param newEncryptedBalances Array of new encrypted balances
     */
    function batchUpdateBalances(
        bytes32 operationId,
        address[] calldata accounts,
        bytes[] calldata newEncryptedBalances
    ) external onlyTEE {
        require(pendingOperations[operationId], "Invalid or already processed operation");
        require(accounts.length == newEncryptedBalances.length, "Array length mismatch");
        
        pendingOperations[operationId] = false;
        
        for (uint256 i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "Invalid account");
            require(newEncryptedBalances[i].length > 0, "Invalid encrypted balance");
            
            encryptedBalances[accounts[i]] = newEncryptedBalances[i];
            emit BalanceUpdate(accounts[i], newEncryptedBalances[i]);
        }
        
        emit BalancesUpdated(operationId, accounts, newEncryptedBalances);
    }
    
    /**
     * @dev Get encrypted balance of an account
     * @param account Account to query
     * @return Encrypted balance
     */
    function balanceOf(address account) external view returns (bytes memory) {
        return encryptedBalances[account];
    }
    
    /**
     * @dev Update TEE oracle address
     * @param newTeeOracle New TEE oracle address
     */
    function updateTeeOracle(address newTeeOracle) external onlyOwner {
        require(newTeeOracle != address(0), "Invalid TEE oracle address");
        teeOracle = newTeeOracle;
    }
    
    /**
     * @dev Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }
}