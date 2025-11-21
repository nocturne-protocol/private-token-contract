// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PrivateERC20} from "./PrivateERC20.sol";
import {Test} from "forge-std/Test.sol";

contract PrivateERC20Test is Test {
    PrivateERC20 privateToken;
    address user1;
    address user2;

    function setUp() public {
        user1 = address(0x1);
        user2 = address(0x2);
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
        bytes memory newEncryptedBalance = hex"fedcba0987654321";
        
        vm.expectEmit(true, false, false, true);
        emit PrivateERC20.BalanceUpdate(user1, newEncryptedBalance);
        
        privateToken.updateBalance(user1, newEncryptedBalance);
        
        bytes memory balance = privateToken.balanceOf(user1);
        assertEq(balance, newEncryptedBalance, "Balance should be updated");
    }

    function test_UpdateBalanceInvalidAccount() public {
        bytes memory newEncryptedBalance = hex"fedcba0987654321";
        
        vm.expectRevert("Invalid account");
        privateToken.updateBalance(address(0), newEncryptedBalance);
    }

    function test_UpdateBalanceEmptyAmount() public {
        vm.expectRevert("Invalid encrypted balance");
        privateToken.updateBalance(user1, "");
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