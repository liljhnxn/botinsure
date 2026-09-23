// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IBotOracle
 * @notice Interface for BotOracle price feeds in the Botchain ecosystem.
 */
interface IBotOracle {
    /**
     * @notice Returns the latest reported answer, timestamp, and round ID for a given feed ID.
     * @param feedId Identifier of the data feed
     * @return answer Price or data value (must be positive and decimal-aware)
     * @return updatedAt Timestamp when the feed was last updated
     * @return roundId Incremental round ID of the oracle report
     */
    function getLatestAnswer(uint256 feedId)
        external
        view
        returns (
            int256 answer,
            uint256 updatedAt,
            uint256 roundId
        );
}
