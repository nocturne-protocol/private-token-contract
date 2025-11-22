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

