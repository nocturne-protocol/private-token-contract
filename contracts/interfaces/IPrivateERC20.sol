// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IexecLibOrders_v5} from "../libraries/IexecLibOrders_v5.sol";

/**
 * @title IPrivateERC20
 * @notice Interface for the PrivateERC20 token with encrypted balances
 * @dev ERC20-like token that uses iExec TEE for privacy-preserving transfers
 */
interface IPrivateERC20 {
    // ============================================
    // EVENTS
    // ============================================

    /**
     * @notice Emitted when tokens are minted to an address
     * @param to The address receiving the minted tokens
     * @param encryptedAmount The encrypted amount of tokens minted
     */
    event Mint(address indexed to, bytes encryptedAmount);

    /**
     * @notice Emitted when an account's encrypted balance is updated
     * @param account The account whose balance was updated
     * @param newEncryptedBalance The new encrypted balance
     */
    event BalanceUpdate(address indexed account, bytes newEncryptedBalance);

    /**
     * @notice Emitted when a transfer request is initiated
     * @param from The sender's address
     * @param to The recipient's address
     * @param encryptedAmount The encrypted amount to transfer
     * @param dealId The deal ID returned from matchOrders
     */
    event TransferRequested(
        address indexed from,
        address indexed to,
        bytes encryptedAmount,
        bytes32 dealId
    );

    /**
     * @notice Emitted when pre-signed orders are stored
     * @param setter The address that stored the orders (owner)
     */
    event OrdersStored(address indexed setter);

    // ============================================
    // EXTERNAL FUNCTIONS
    // ============================================

    /**
     * @notice Store pre-signed orders for iExec matchOrders
     * @dev These orders should be signed off-chain by the respective owners
     * @param _appOrder Pre-signed app order from app owner
     * @param _workerpoolOrder Pre-signed workerpool order from workerpool owner
     * @param _datasetOrder Dataset order (use empty order with dataset=address(0) if no dataset)
     */
    function storeOrders(
        IexecLibOrders_v5.AppOrder calldata _appOrder,
        IexecLibOrders_v5.WorkerpoolOrder calldata _workerpoolOrder,
        IexecLibOrders_v5.DatasetOrder calldata _datasetOrder
    ) external;

    /**
     * @notice Update PocoOApp router address
     * @param _pocoOAppRouter New router address
     */
    function setPocoOAppRouter(address _pocoOAppRouter) external;

    /**
     * @notice Update Poco contract address
     * @param _pocoAddress New Poco address
     */
    function setPocoAddress(address _pocoAddress) external;

    /**
     * @notice Update LayerZero options
     * @param _lzOptions New LZ options
     */
    function setLzOptions(bytes calldata _lzOptions) external;

    /**
     * @notice Mint tokens with encrypted amount
     * @param to Address to mint tokens to
     * @param encryptedAmount Encrypted amount to mint
     */
    function mint(address to, bytes calldata encryptedAmount) external;

    /**
     * @notice Request a transfer operation to be processed by TEE
     * @dev Requires payment for LayerZero fees (msg.value)
     * @param to Recipient address
     * @param encryptedAmount Encrypted amount to transfer
     */
    function transfer(address to, bytes calldata encryptedAmount) external payable;

    /**
     * @notice Update encrypted balances for sender and receiver
     * @dev This function should only be called by the iExec TEE enclave
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
    ) external;

    /**
     * @notice Get encrypted balance of an account
     * @param account Account to query
     * @return The encrypted balance
     */
    function balanceOf(address account) external view returns (bytes memory);
}

