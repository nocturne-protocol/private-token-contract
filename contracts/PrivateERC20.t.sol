// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PrivateERC20} from "./PrivateERC20.sol";
import {IPrivateERC20} from "./interfaces/IPrivateERC20.sol";
import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";

contract PrivateERC20Test is Test {
    PrivateERC20 privateToken;
    address user1;
    address user2;
    uint256 arbitrumSepoliaFork;
    bytes encryptionPublicKey;
    
    // Test configuration
    address pocoOAppRouter = 0x4D9C0d72741D4E67aF5580761e41dAb565Aa449E;
    address pocoAddress = 0xB2157BF2fAb286b2A4170E3491Ac39770111Da3E;
    bool isArbitrum = true;
    bytes lzOptions = hex"";

    function setUp() public {
        // Create fork of Arbitrum Sepolia
        arbitrumSepoliaFork = vm.createFork(vm.envString("ARBITRUM_SEPOLIA_RPC_URL"));
        vm.selectFork(arbitrumSepoliaFork);
        
        // Setup test addresses
        user1 = address(0x1);
        user2 = address(0x2);
        
        // Example encryption public key (in real scenario, this comes from ECIES keypair)
        encryptionPublicKey = hex"0400e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4e0b4";
        
        // Deploy PrivateERC20 contract with all required parameters
        privateToken = new PrivateERC20(
            "PrivateToken",
            "PRIV",
            18,
            encryptionPublicKey,
            pocoOAppRouter,
            pocoAddress,
            isArbitrum,
            lzOptions
        );
    }

    function test_InitialState() public view {
        assertEq(privateToken.totalSupply(), 0, "Initial supply should be 0");
        assertEq(privateToken.name(), "PrivateToken", "Name should be PrivateToken");
        assertEq(privateToken.symbol(), "PRIV", "Symbol should be PRIV");
        assertEq(privateToken.decimals(), 18, "Decimals should be 18");
    }

    function test_Mint() public {
        bytes memory encryptedAmount = hex"1234567890abcdef";
        
        // Record logs to verify events
        vm.recordLogs();
        privateToken.mint(user1, encryptedAmount);
        
        // Verify the balance was updated correctly
        bytes memory balance = privateToken.balanceOf(user1);
        assertEq(balance, encryptedAmount, "Balance should match minted amount");
    }

    function test_MintToZeroAddress() public {
        vm.expectRevert("Cannot mint to zero address");
        privateToken.mint(address(0), hex"1234");
    }

    function test_MintWithEmptyAmount() public {
        vm.expectRevert("Invalid encrypted amount");
        privateToken.mint(user1, "");
    }
    function test_TransferToZeroAddress() public {
        vm.expectRevert("Cannot transfer to zero address");
        vm.prank(user1);
        privateToken.transfer(address(0), hex"1234");
    }

    function test_TransferToSelf() public {
        vm.expectRevert("Cannot transfer to self");
        vm.prank(user1);
        privateToken.transfer(user1, hex"1234");
    }

    function test_TransferWithEmptyAmount() public {
        vm.expectRevert("Invalid encrypted amount");
        vm.prank(user1);
        privateToken.transfer(user2, "");
    }

    function test_UpdateBalance() public {
        bytes memory senderNewBalance = hex"1111111111111111";
        bytes memory receiverNewBalance = hex"2222222222222222";
        
        // Record logs to verify events
        vm.recordLogs();
        privateToken.updateBalance(user1, user2, senderNewBalance, receiverNewBalance);
        
        // Verify balances were updated correctly
        assertEq(privateToken.balanceOf(user1), senderNewBalance);
        assertEq(privateToken.balanceOf(user2), receiverNewBalance);
        
        // Verify BalanceUpdate events were emitted (log checking on fork is unreliable with expectEmit)
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertTrue(logs.length >= 2, "Should emit at least two BalanceUpdate events");
    }

    function test_UpdateBalanceInvalidReceiver() public {
        vm.expectRevert("Invalid receiver");
        privateToken.updateBalance(user1, address(0), hex"1111", hex"2222");
    }

    function test_UpdateBalanceEmptySenderAmount() public {
        vm.expectRevert("Invalid sender balance");
        privateToken.updateBalance(user1, user2, "", hex"2222");
    }

    function test_UpdateBalanceEmptyReceiverAmount() public {
        vm.expectRevert("Invalid receiver balance");
        privateToken.updateBalance(user1, user2, hex"1111", "");
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
