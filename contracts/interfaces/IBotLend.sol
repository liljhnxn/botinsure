// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IBotLend
 * @notice Interface for interacting with BotLend lending positions.
 */
interface IBotLend {
    /**
     * @notice Returns the health factor of a user's lending/borrowing position (18 decimals, 1e18 = 1.0).
     * @param user Address of the borrower/user
     * @return healthFactor Current health factor scaled by 1e18
     */
    function getHealthFactor(address user) external view returns (uint256);

    /**
     * @notice Returns the outstanding debt of a user in underlying asset.
     * @param user Address of the borrower/user
     */
    function getDebt(address user) external view returns (uint256);

    /**
     * @notice Returns the collateral balance of a user in underlying asset.
     * @param user Address of the borrower/user
     */
    function getCollateralBalance(address user) external view returns (uint256);
}
