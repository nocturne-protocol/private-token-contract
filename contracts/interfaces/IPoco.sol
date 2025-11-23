// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IexecLibOrders_v5} from "../libraries/IexecLibOrders_v5.sol";

/**
 * @title IPoco
 * @notice Interface for the iExec Poco contract
 * @dev Used to call matchOrders directly on Arbitrum
 */
interface IPoco {
    /**
     * @notice Get the RLC token address
     * @return The address of the RLC token
     */
    function token() external view returns (address);

    /**
     * @notice Deposit RLC tokens to get sRLC for a target address
     * @param amount Amount of RLC to deposit
     * @param target Address to receive the sRLC
     * @return success True if deposit succeeded
     */
    function depositFor(uint256 amount, address target) external returns (bool success);

    /**
     * @notice Pre-sign a request order to avoid requiring signature during matchOrders
     * @param _requestorderoperation The request order operation containing the order and SIGN operation
     */
    function manageRequestOrder(
        IexecLibOrders_v5.RequestOrderOperation calldata _requestorderoperation
    ) external;

    /**
     * @notice Match orders to create a deal on the iExec protocol
     * @param _apporder The app order
     * @param _datasetorder The dataset order
     * @param _workerpoolorder The workerpool order
     * @param _requestorder The request order
     * @return dealId The ID of the created deal
     */
    function matchOrders(
        IexecLibOrders_v5.AppOrder calldata _apporder,
        IexecLibOrders_v5.DatasetOrder calldata _datasetorder,
        IexecLibOrders_v5.WorkerpoolOrder calldata _workerpoolorder,
        IexecLibOrders_v5.RequestOrder calldata _requestorder
    ) external returns (bytes32 dealId);
}

