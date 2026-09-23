// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBotInsurePoolToken is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

interface IBotInsurePoolTokenFactory {
    function createShareToken(
        string memory name,
        string memory symbol,
        uint256 poolId,
        address botInsureCore
    ) external returns (address);
}
