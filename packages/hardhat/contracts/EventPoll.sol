// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract EventPolls {
  event Deposit(address indexed sender, uint256 amount, uint256 balance);
  event Voted(address indexed voter, uint256 pollId);
  event PollCreated(address indexed user, uint256 pollId);

  struct Poll {
    uint pollId;
    string content;
    string[] results;
    address[] voters;
  }

  struct User {
    address wallet;
    string name;
    uint[] userPolls;
  }
  mapping(uint => Poll) public polls; //stores and retrieve polls
  mapping(address => User) public users; // stores and retrieves users
  mapping(address => uint[]) public userPolls; // stores and retrieves user polls

  uint256 public nextPollId;

  constructor() payable {}

  // on create poll
  function createBinaryPoll(string calldata _content) external payable returns (bool) {
    require(bytes(_content).length > 0, "Content cannot be an empty string");

    User storage user = users[msg.sender];

    string[] memory results;
    address[] memory voters;
    Poll memory newPoll = Poll(nextPollId, _content, results, voters);
    polls[nextPollId] = newPoll;
    user.userPolls.push(nextPollId);

    userPolls[msg.sender].push(nextPollId);
    nextPollId++;
    emit PollCreated(msg.sender, nextPollId);
    return true;
  }

  // on vote
  function voteOnPoll(string calldata _vote, uint _pollId) external {
    Poll storage activePoll = polls[_pollId];
    require(activePoll.pollId == _pollId, "Poll does not exist");
    require(
      activePoll.voters.length == 0 || !contains(activePoll.voters, msg.sender),
      "User has already voted on this poll"
    );
    activePoll.voters.push(msg.sender);
    activePoll.results.push(_vote);
    emit Voted(msg.sender, _pollId);
  }

  //check if an element is in an array
  function contains(address[] storage array, address element) internal view returns (bool) {
    for (uint i = 0; i < array.length; i++) {
      if (array[i] == element) {
        return true;
      }
    }
    return false;
  }

  function getPollResults(uint _pollId) external view returns (Poll memory) {
    return polls[_pollId];
  }

  function getUserPolls(address user) external view returns (uint[] memory) {
    return userPolls[user];
  }
}
