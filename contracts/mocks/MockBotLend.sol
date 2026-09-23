// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IBotLend.sol";

/**
 * @title MockBotLend
 * @notice Mock implementation of BotLend for testing liquidation protection.
 */
contract MockBotLend is IBotLend {
    struct Position {
        uint256 healthFactor; // 18 decimals, 1e18 = 1.0
        uint256 debt;
        uint256 collateral;
    }

    mapping(address => Position) public positions;
    address public owner;

    event PositionUpdated(address indexed user, uint256 healthFactor, uint256 debt, uint256 collateral);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Set health factor, debt, and collateral for a user.
     */
    function setPosition(
        address user,
        uint256 healthFactor,
        uint256 debt,
        uint256 collateral
    ) external {
        positions[user] = Position({
            healthFactor: healthFactor,
            debt: debt,
            collateral: collateral
        });
        emit PositionUpdated(user, healthFactor, debt, collateral);
    }

    /**
     * @notice Convenient helper to update health factor alone.
     */
    function setHealthFactor(address user, uint256 healthFactor) external {
        positions[user].healthFactor = healthFactor;
        emit PositionUpdated(user, healthFactor, positions[user].debt, positions[user].collateral);
    }

    function getHealthFactor(address user) external view override returns (uint256) {
        // If not set, return safe health factor (e.g. 2.0 = 2e18)
        if (positions[user].healthFactor == 0) {
            return 2 * 10**18;
        }
        return positions[user].healthFactor;
    }

    function getDebt(address user) external view override returns (uint256) {
        return positions[user].debt;
    }

    function getCollateralBalance(address user) external view override returns (uint256) {
        return positions[user].collateral;
    }
}
