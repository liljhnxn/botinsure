// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IBotOracle.sol";

/**
 * @title MockBotOracle
 * @notice Mock implementation of BotOracle for unit testing and local deployment.
 */
contract MockBotOracle is IBotOracle {
    struct FeedData {
        int256 answer;
        uint256 updatedAt;
        uint256 roundId;
        uint8 decimals;
        bool exists;
    }

    mapping(uint256 => FeedData) public feeds;
    address public owner;

    event FeedUpdated(uint256 indexed feedId, int256 answer, uint256 updatedAt, uint256 roundId);

    modifier onlyOwner() {
        require(msg.sender == owner, "MockBotOracle: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Set or update feed data.
     */
    function setFeed(
        uint256 feedId,
        int256 answer,
        uint256 updatedAt,
        uint256 roundId,
        uint8 decimals_
    ) external {
        feeds[feedId] = FeedData({
            answer: answer,
            updatedAt: updatedAt,
            roundId: roundId,
            decimals: decimals_,
            exists: true
        });
        emit FeedUpdated(feedId, answer, updatedAt, roundId);
    }

    /**
     * @notice Quick helper to set current price with current timestamp and auto-increment round.
     */
    function setPrice(uint256 feedId, int256 price) external {
        FeedData storage feed = feeds[feedId];
        uint256 nextRound = feed.roundId + 1;
        uint8 dec = feed.exists ? feed.decimals : 8;
        feeds[feedId] = FeedData({
            answer: price,
            updatedAt: block.timestamp,
            roundId: nextRound,
            decimals: dec,
            exists: true
        });
        emit FeedUpdated(feedId, price, block.timestamp, nextRound);
    }

    function getLatestAnswer(uint256 feedId)
        external
        view
        override
        returns (
            int256 answer,
            uint256 updatedAt,
            uint256 roundId
        )
    {
        FeedData memory feed = feeds[feedId];
        require(feed.exists, "MockBotOracle: feed does not exist");
        return (feed.answer, feed.updatedAt, feed.roundId);
    }

    function getDecimals(uint256 feedId) external view returns (uint8) {
        FeedData memory feed = feeds[feedId];
        require(feed.exists, "MockBotOracle: feed does not exist");
        return feed.decimals;
    }
}
