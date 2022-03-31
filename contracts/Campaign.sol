// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

contract CampaignFactory {
    Campaign[] public deployedCampaigns;
    event CreateCampaign(address indexed creator, Campaign indexed newCampaign, uint minimumContributionNum);
    
    // this function will create an instance of Campaign contract.
    // it also set 2 paras in Campaign's constructor.
    function createCampaign(uint minimum) public {
        Campaign _newCampaign = new Campaign(minimum, msg.sender);
        deployedCampaigns.push(_newCampaign);

        emit CreateCampaign(msg.sender, _newCampaign, minimum);
    }
    function getdeployedCampaigns() public view returns(Campaign[] memory) {
        return deployedCampaigns;
    }

    // Get the deployed Campaign contract
    function getContract(address _deployCampaign) public pure returns(Campaign) {
        return Campaign(_deployCampaign);
    }

}

contract Campaign {
    event CreateRequest(uint index, address to, uint amount, string des);
    event Contribute(address from, uint amount);
    event AprroveRequest(uint index, address contributor);
    event ExecuteRequest(uint index, address to, uint amount);

    struct Request {
        string description;
        uint value;
        address recipient;
        bool completed;
        uint approvalCount;
    }

    uint private totalContributionValue;
    mapping(uint => mapping(address => bool)) public approved;
    Request[] public requests;

    address public manager;
    uint public minimumContribution;
    mapping(address => bool) public contributors;
    uint public numOfContributors;
    uint private requestIndex;

    constructor (uint minimum, address creator) {
        manager = creator;
        minimumContribution = minimum;
    }

    modifier onlyManager() {
        require(msg.sender == manager, "Campaign: You are not the manager");
        _;
    }

    modifier onlyContributors() {
        require(contributors[msg.sender], "Campaign: You are not the contributor");
        _;
    }

    modifier requestIndexExist(uint _requestIndex) {
        require(_requestIndex < requests.length, "Campaign: The request not existed");
        _;
    }
    
    function contribute() public payable {
        require(msg.value > minimumContribution, "Campaign: Your contribution should be more");
        contributors[msg.sender] = true;
        numOfContributors ++;
        totalContributionValue += msg.value;

        emit Contribute(msg.sender, msg.value);
        
    }

    function getTotalContribution() public view returns(uint) {
        return totalContributionValue;
    }

    function createRequest(string memory _description, uint _value, address _recipient) public onlyManager {
        Request memory newRequest = Request({
            description: _description, 
            value:_value, 
            recipient: _recipient, 
            completed: false,
            approvalCount: 0});
        requests.push(newRequest);
        requestIndex ++;
        emit CreateRequest(requestIndex, _recipient, _value, _description);
    }

    function approveRequest(uint _requestIndex) public onlyContributors requestIndexExist(_requestIndex) {
        require(approved[_requestIndex][msg.sender] == false, "Campaign: You already approve this request");
        requests[_requestIndex].approvalCount ++;
        approved[_requestIndex][msg.sender] = true;

        emit AprroveRequest(_requestIndex, msg.sender);
    }

    function undoAprroval(uint _requestIndex) public onlyContributors requestIndexExist(_requestIndex) {
        require(approved[_requestIndex][msg.sender] == true, "Campaign: You has not aprroved this request");
        requests[_requestIndex].approvalCount --;
        approved[_requestIndex][msg.sender] = false;
    }

    function excuteRequest(uint _requestIndex) public onlyManager requestIndexExist(_requestIndex) {
        require(totalContributionValue >= requests[_requestIndex].value, "Campaign: Not enough contributions");
        require(requests[_requestIndex].approvalCount > numOfContributors/2, "Campaign: Not enough aprrovals" );
        require(requests[_requestIndex].completed == false, "Campaign: The request already executed");
        totalContributionValue -= requests[_requestIndex].value;
        requests[_requestIndex].completed = true;
        payable(requests[_requestIndex].recipient).transfer(requests[_requestIndex].value);

        emit ExecuteRequest(_requestIndex, requests[_requestIndex].recipient,requests[_requestIndex].value);
        
    }

    function getRequest(uint _requestIndex) public view returns(Request memory) {
        return requests[_requestIndex];
    }

    function getRequestArray() public view returns(Request[] memory) {
        return requests;
    }   
}