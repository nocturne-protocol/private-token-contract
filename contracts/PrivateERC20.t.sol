// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PrivateERC20} from "./PrivateERC20.sol";
import {Test} from "forge-std/Test.sol";

contract PrivateERC20Test is Test {
    PrivateERC20 privateToken;
    address user1;
    address user2;
    uint256 arbitrumSepoliaFork;

    function setUp() public {
        // Create fork of Arbitrum Sepolia
        arbitrumSepoliaFork = vm.createFork(vm.envString("ARBITRUM_SEPOLIA_RPC_URL"));
        vm.selectFork(arbitrumSepoliaFork);
        
        // Setup test addresses
        user1 = address(0x1);
        user2 = address(0x2);
        
        // Deploy PrivateERC20 contract
        privateToken = new PrivateERC20("PrivateToken", "PRIV", 18);
    }

    function test_InitialState() public view {
        assertEq(privateToken.totalSupply(), 0, "Initial supply should be 0");
        assertEq(privateToken.name(), "PrivateToken", "Name should be PrivateToken");
        assertEq(privateToken.symbol(), "PRIV", "Symbol should be PRIV");
        assertEq(privateToken.decimals(), 18, "Decimals should be 18");
    }

    function test_Mint() public {
        bytes memory encryptedAmount = hex"1234567890abcdef";
        
        vm.expectEmit(true, false, false, true);
        emit PrivateERC20.Mint(user1, encryptedAmount);
        
        privateToken.mint(user1, encryptedAmount);
        
        bytes memory balance = privateToken.balanceOf(user1);
        assertEq(balance, encryptedAmount, "Balance should match minted amount");
    }

    function test_MintToZeroAddress() public {
        bytes memory encryptedAmount = hex"1234567890abcdef";
        
        vm.expectRevert("Cannot mint to zero address");
        privateToken.mint(address(0), encryptedAmount);
    }

    function test_MintWithEmptyAmount() public {
        vm.expectRevert("Invalid encrypted amount");
        privateToken.mint(user1, "");
    }

    function test_Transfer() public {
        bytes memory encryptedAmount = hex"1234567890abcdef";
        
        vm.expectEmit(true, true, false, true);
        emit PrivateERC20.TransferRequested(user1, user2, encryptedAmount);
        
        vm.prank(user1);
        privateToken.transfer(user2, encryptedAmount);
    }

    function test_TransferToZeroAddress() public {
        bytes memory encryptedAmount = hex"1234567890abcdef";
        
        vm.expectRevert("Cannot transfer to zero address");
        vm.prank(user1);
        privateToken.transfer(address(0), encryptedAmount);
    }

    function test_TransferToSelf() public {
        bytes memory encryptedAmount = hex"1234567890abcdef";
        
        vm.expectRevert("Cannot transfer to self");
        vm.prank(user1);
        privateToken.transfer(user1, encryptedAmount);
    }

    function test_TransferWithEmptyAmount() public {
        vm.expectRevert("Invalid encrypted amount");
        vm.prank(user1);
        privateToken.transfer(user2, "");
    }

    function test_UpdateBalance() public {
        bytes memory senderNewBalance = hex"1111111111111111";
        bytes memory receiverNewBalance = hex"2222222222222222";
        
        vm.expectEmit(true, false, false, true);
        emit PrivateERC20.BalanceUpdate(user1, senderNewBalance);
        
        vm.expectEmit(true, false, false, true);
        emit PrivateERC20.BalanceUpdate(user2, receiverNewBalance);
        
        privateToken.updateBalance(user1, user2, senderNewBalance, receiverNewBalance);
        
        assertEq(privateToken.balanceOf(user1), senderNewBalance, "Sender balance should be updated");
        assertEq(privateToken.balanceOf(user2), receiverNewBalance, "Receiver balance should be updated");
    }

    function test_UpdateBalanceInvalidSender() public {
        bytes memory senderBalance = hex"1111111111111111";
        bytes memory receiverBalance = hex"2222222222222222";
        
        vm.expectRevert("Invalid sender");
        privateToken.updateBalance(address(0), user2, senderBalance, receiverBalance);
    }

    function test_UpdateBalanceInvalidReceiver() public {
        bytes memory senderBalance = hex"1111111111111111";
        bytes memory receiverBalance = hex"2222222222222222";
        
        vm.expectRevert("Invalid receiver");
        privateToken.updateBalance(user1, address(0), senderBalance, receiverBalance);
    }

    function test_UpdateBalanceEmptySenderAmount() public {
        bytes memory receiverBalance = hex"2222222222222222";
        
        vm.expectRevert("Invalid sender balance");
        privateToken.updateBalance(user1, user2, "", receiverBalance);
    }

    function test_UpdateBalanceEmptyReceiverAmount() public {
        bytes memory senderBalance = hex"1111111111111111";
        
        vm.expectRevert("Invalid receiver balance");
        privateToken.updateBalance(user1, user2, senderBalance, "");
    }

    function test_BalanceOf() public {
        bytes memory encryptedAmount = hex"1234567890abcdef";
        privateToken.mint(user1, encryptedAmount);
        
        bytes memory balance = privateToken.balanceOf(user1);
        assertEq(balance, encryptedAmount, "Should return correct balance");
    }

    function test_MultipleMints() public {
        bytes memory amount1 = hex"1111111111111111";
        bytes memory amount2 = hex"2222222222222222";
        
        privateToken.mint(user1, amount1);
        privateToken.mint(user2, amount2);
        
        assertEq(privateToken.balanceOf(user1), amount1, "User1 balance incorrect");
        assertEq(privateToken.balanceOf(user2), amount2, "User2 balance incorrect");
    }
}