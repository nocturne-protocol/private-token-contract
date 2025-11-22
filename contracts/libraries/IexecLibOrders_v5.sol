// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IexecLibOrders_v5
 * @notice Library containing iExec order structures for PoCo v5
 * @dev These structures are used for matchOrders calls on the iExec protocol
 */
library IexecLibOrders_v5 {
    /**
     * @notice App order structure
     * @dev Signed by the app owner to authorize app usage
     */
    struct AppOrder {
        address app;                    // Address of the app contract
        uint256 appprice;              // Price per task in nRLC
        uint256 volume;                // Number of tasks authorized
        bytes32 tag;                   // TEE tag requirements
        address datasetrestrict;       // Restrict to specific dataset (address(0) = no restriction)
        address workerpoolrestrict;    // Restrict to specific workerpool (address(0) = no restriction)
        address requesterrestrict;     // Restrict to specific requester (address(0) = no restriction)
        bytes32 salt;                  // Unique salt for order
        bytes sign;                    // Signature of the order
    }

    /**
     * @notice Dataset order structure
     * @dev Signed by the dataset owner to authorize dataset usage
     */
    struct DatasetOrder {
        address dataset;               // Address of the dataset contract
        uint256 datasetprice;         // Price per task in nRLC
        uint256 volume;               // Number of tasks authorized
        bytes32 tag;                  // TEE tag requirements
        address apprestrict;          // Restrict to specific app (address(0) = no restriction)
        address workerpoolrestrict;   // Restrict to specific workerpool (address(0) = no restriction)
        address requesterrestrict;    // Restrict to specific requester (address(0) = no restriction)
        bytes32 salt;                 // Unique salt for order
        bytes sign;                   // Signature of the order
    }

    /**
     * @notice Workerpool order structure
     * @dev Signed by the workerpool owner to authorize task execution
     */
    struct WorkerpoolOrder {
        address workerpool;           // Address of the workerpool contract
        uint256 workerpoolprice;     // Price per task in nRLC
        uint256 volume;              // Number of tasks authorized
        bytes32 tag;                 // TEE tag requirements
        uint256 category;            // Task category (compute resources)
        uint256 trust;               // Trust level required
        address apprestrict;         // Restrict to specific app (address(0) = no restriction)
        address datasetrestrict;     // Restrict to specific dataset (address(0) = no restriction)
        address requesterrestrict;   // Restrict to specific requester (address(0) = no restriction)
        bytes32 salt;                // Unique salt for order
        bytes sign;                  // Signature of the order
    }

    /**
     * @notice Request order structure
     * @dev Created by the requester to request task execution
     */
    struct RequestOrder {
        address app;                 // Address of the app to execute
        uint256 appmaxprice;        // Maximum price willing to pay for app
        address dataset;            // Address of the dataset (address(0) = no dataset)
        uint256 datasetmaxprice;    // Maximum price willing to pay for dataset
        address workerpool;         // Address of the workerpool (address(0) = no restriction)
        uint256 workerpoolmaxprice; // Maximum price willing to pay for workerpool
        address requester;          // Address of the requester
        uint256 volume;             // Number of tasks to execute
        bytes32 tag;                // TEE tag requirements
        uint256 category;           // Task category
        uint256 trust;              // Trust level required
        address beneficiary;        // Address to receive results
        address callback;           // Address to callback after execution
        string params;              // JSON parameters for the task
        bytes32 salt;               // Unique salt for order
        bytes sign;                 // Signature of the order
    }
}

