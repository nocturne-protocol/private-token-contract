// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IPocoOApp
 * @notice Interface for the PocoOApp LayerZero router
 * @dev This interface is used to route cross-chain calls to the iExec PoCo contract on Arbitrum
 * 
 * The PocoOApp contract acts as a bridge between chains using LayerZero:
 * - On non-Arbitrum chains: Acts as a Router, forwarding calls to Arbitrum
 * - On Arbitrum: Acts as a Receiver, executing calls on the PoCo contract
 */
interface IPocoOApp {
    /**
     * @notice Routes a function call to the PoCo contract on Arbitrum via LayerZero
     * @dev This function should be called with sufficient native token value to cover LayerZero fees
     * 
     * @param targetFunction The function selector to call on the PoCo contract (e.g., 0x156194d4 for matchOrders)
     * @param payload The encoded function arguments (abi.encode of the function parameters)
     * @param refundAddress The address to refund any excess LayerZero fees
     * @param options LayerZero adapter parameters for gas settings and execution options
     * @return nonce The nonce of the cross-chain LayerZero message
     */
    function routeCall(
        bytes4 targetFunction,
        bytes calldata payload,
        address refundAddress,
        bytes calldata options
    ) external payable returns (uint64 nonce);

    /**
     * @notice Quote the LayerZero fee for routing a call to Arbitrum
     * @dev Use this to estimate the required msg.value for routeCall
     * 
     * @param targetFunction The function selector (for gas estimation)
     * @param payload The encoded function call data
     * @param options LayerZero adapter parameters
     * @param payInLzToken Whether to return fee in ZRO token (typically false)
     * @return fee The MessagingFee struct containing nativeFee and lzTokenFee
     */
    function quoteCall(
        bytes4 targetFunction,
        bytes calldata payload,
        bytes calldata options,
        bool payInLzToken
    ) external view returns (MessagingFee memory fee);

    /**
     * @notice MessagingFee structure from LayerZero
     * @dev Returned by quoteCall to indicate required fees
     */
    struct MessagingFee {
        uint256 nativeFee;  // Fee in native gas token (ETH, etc.)
        uint256 lzTokenFee; // Fee in LayerZero token (if applicable)
    }
}

