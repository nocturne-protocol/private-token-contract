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
    uint256 public totalSupply;
    
    // Encrypted balances mapping: address => encrypted balance
    mapping(address => bytes) public encryptedBalances;
    
    // Events
    event Mint(address indexed to, bytes encryptedAmount);
    event BalanceUpdate(address indexed account, bytes newEncryptedBalance);
    event TransferRequested(
        address indexed from,
        address indexed to,
        bytes encryptedAmount
    );
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = 0;
    }
    
    /**
     * @dev Mint tokens with encrypted amount
     * @param to Address to mint tokens to
     * @param encryptedAmount Encrypted amount to mint
     */
    function mint(address to, bytes calldata encryptedAmount) external {
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
        
        //TODO: Call iExec MatchOrder to process the transfer in TEE off-chain
        emit TransferRequested(msg.sender, to, encryptedAmount);
    }
    
    /**
     * @dev Update encrypted balance for an account
     * This function should only be called by the iExec TEE enclave
     * after off-chain decryption and computation
     * @param account Account to update
     * @param newEncryptedBalance New encrypted balance
     */
    function updateBalance(address account, bytes calldata newEncryptedBalance) external {
        require(account != address(0), "Invalid account");
        require(newEncryptedBalance.length > 0, "Invalid encrypted balance");
        
        encryptedBalances[account] = newEncryptedBalance;
        emit BalanceUpdate(account, newEncryptedBalance);
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