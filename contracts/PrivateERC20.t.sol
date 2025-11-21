// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PrivateERC20} from "./PrivateERC20.sol";
import {Test} from "forge-std/Test.sol";

contract PrivateERC20Test is Test {
    PrivateERC20 privateToken;
    address owner;
    address teeOracle;
    address user1;
    address user2;

    function setUp() public {
        owner = address(this);
        teeOracle = address(0x123);
        user1 = address(0x1);
        user2 = address(0x2);
        privateToken = new PrivateERC20("PrivateToken", "PRIV", 18, teeOracle);
    }

    function test_InitialState() public view {
        require(privateToken.totalSupply() == 0, "Initial supply should be 0");
        require(privateToken.owner() == owner, "Owner should be test contract");
        require(privateToken.teeOracle() == teeOracle, "TEE oracle should be set");
        require(keccak256(abi.encodePacked(privateToken.name())) == keccak256(abi.encodePacked("PrivateToken")), "Name should be PrivateToken");
    }

    function test_Mint() public {
        bytes memory encryptedAmount = hex"1234567890abcdef";
        privateToken.mint(user1, encryptedAmount);
        
        bytes memory balance = privateToken.balanceOf(user1);
        require(keccak256(balance) == keccak256(encryptedAmount), "Balance should match minted amount");
    }

    function test_Transfer() public {
        bytes memory encryptedAmount = hex"1234567890abcdef";
        
        // This should emit TransferRequested and Transfer events
        vm.prank(user1);
        privateToken.transfer(user2, encryptedAmount);
    }

    function test_UpdateBalanceByTEE() public {
        bytes memory newEncryptedBalance = hex"fedcba0987654321";
        
        vm.prank(teeOracle);
        privateToken.updateBalance(user1, newEncryptedBalance);
        
        bytes memory balance = privateToken.balanceOf(user1);
        require(keccak256(balance) == keccak256(newEncryptedBalance), "Balance should be updated");
    }

    function test_BatchUpdateBalancesByTEE() public {
        // First create a transfer request to get an operation ID
        bytes memory encryptedAmount = hex"1234567890abcdef";
        vm.prank(user1);
        privateToken.transfer(user2, encryptedAmount);
        
        // Calculate the operation ID
        bytes32 operationId = keccak256(abi.encodePacked(
            user1,
            user2,
            encryptedAmount,
            block.timestamp,
            block.number
        ));
        
        // Now update balances
        address[] memory accounts = new address[](2);
        accounts[0] = user1;
        accounts[1] = user2;
        
        bytes[] memory newBalances = new bytes[](2);
        newBalances[0] = hex"1111111111111111";
        newBalances[1] = hex"2222222222222222";
        
        vm.prank(teeOracle);
        privateToken.batchUpdateBalances(operationId, accounts, newBalances);
        
        require(keccak256(privateToken.balanceOf(user1)) == keccak256(newBalances[0]), "User1 balance should be updated");
        require(keccak256(privateToken.balanceOf(user2)) == keccak256(newBalances[1]), "User2 balance should be updated");
    }

    function testFail_MintByNonOwner() public {
        bytes memory encryptedAmount = hex"1234567890abcdef";
        vm.prank(user1);
        privateToken.mint(user2, encryptedAmount);
    }

    function testFail_UpdateBalanceByNonTEE() public {
        bytes memory newEncryptedBalance = hex"fedcba0987654321";
        vm.prank(user1);
        privateToken.updateBalance(user2, newEncryptedBalance);
    }
}