const { messagePrefix } = require("@ethersproject/hash");
const { expect, assert } = require("chai");
const { getAddress } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("Create campaign", function () {
  let [manager, accountA, accountB, accountC, accountD] = []
  let campaign
  let campaignFactory
  let minimum = ethers.utils.parseEther("1.0")
  beforeEach(async () => {
    [manager, accountA, accountB, accountC, accountD] = await ethers.getSigners();
    const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
    campaignFactory = await CampaignFactory.deploy();
    await campaignFactory.deployed();      
  })

  describe("create Campaign via CampaignFactory", function () {
    it("should create campaign correctly", async function () {
      await campaignFactory.createCampaign(minimum)
      deployedCampaigns = await campaignFactory.getdeployedCampaigns()
      assert.equal(deployedCampaigns.length, 1)
    }); 
  })

  describe("test Campaign", function () {
    beforeEach(async () => {
      await campaignFactory.createCampaign(minimum);
      deployedCampaigns = await campaignFactory.getdeployedCampaigns();     
      const deployedCampaign = await campaignFactory.getContract(deployedCampaigns[0]);
      campaign = await (await ethers.getContractFactory("Campaign")).attach(deployedCampaign)

    })
    describe("create Request", function () {
      it("should revert if the caller is not the manager", async function () {
        await (expect(campaign.connect(accountA).createRequest("buy laptop",ethers.utils.parseEther("2.0"), accountC.address))).to.be.revertedWith("Campaign: You are not the manager")
      });
      it("should create request correctly", async function () {
        await campaign.createRequest("buy laptop",ethers.utils.parseEther("2.0"), accountB.address)
        const requests = await campaign.getRequestArray()
        assert.equal(requests.length, 1)
      });
  })

    describe("contribute", function () {
      it("should revert if the contribution value is less than minimumContribution", async function () {
        await (expect(campaign.contribute({value: ethers.utils.parseEther("0.5")}))).to.be.revertedWith("Campaign: Your contribution should be more")
      });
      it("should contribute correctly", async function () {
        await campaign.contribute({value: ethers.utils.parseEther("2.0")})
        await campaign.connect(accountA).contribute({value: ethers.utils.parseEther("2.0")})
        expect(await campaign.getTotalContribution()).to.be.equal(ethers.utils.parseEther("4.0"))
      });
    })

    describe("approve request", function () {
      beforeEach(async () => {
        await campaign.contribute({value: ethers.utils.parseEther("2.0")})
        await campaign.connect(accountA).contribute({value: ethers.utils.parseEther("2.0")})
        await campaign.connect(accountB).contribute({value: ethers.utils.parseEther("2.0")})

        await campaign.createRequest("buy laptop",ethers.utils.parseEther("2.0"), accountC.address)
        await campaign.createRequest("buy clothes",ethers.utils.parseEther("2.0"), accountD.address)
      })
      it("should revert if the caller is not the contributor", async function () {
        await (expect(campaign.connect(accountD).approveRequest(1))).to.be.revertedWith("Campaign: You are not the contributor")
      });
      it("should revert if the request not exist", async function () {
        await (expect(campaign.approveRequest(2))).to.be.revertedWith("Campaign: The request not existed")
      });
      it("should revert if the caller already approved", async function () {
        await campaign.approveRequest(0)
        await (expect(campaign.approveRequest(0))).to.be.revertedWith("Campaign: You already approve this request")
      });
      it("should aprrove correctly", async function () {
        await campaign.approveRequest(0)
        await campaign.connect(accountA).approveRequest(0)
        const requests = await campaign.getRequestArray()
        assert.equal(requests[0].approvalCount, 2)      
      });

    })
    describe("undo approval", function () {
      beforeEach(async () => {
        await campaign.contribute({value: ethers.utils.parseEther("2.0")})
        await campaign.connect(accountA).contribute({value: ethers.utils.parseEther("2.0")})
        await campaign.connect(accountB).contribute({value: ethers.utils.parseEther("2.0")})

        await campaign.createRequest("buy laptop",ethers.utils.parseEther("2.0"), accountC.address)
        await campaign.createRequest("buy clothes",ethers.utils.parseEther("2.0"), accountD.address)
      })
      it("should revert if the caller has not approved", async function () {
        await (expect(campaign.undoAprroval(0))).to.be.revertedWith("Campaign: You has not aprroved this request")
      });
      it("should undo approval correctly", async function () {
        await campaign.approveRequest(0)
        await campaign.undoAprroval(0)

        const requests = await campaign.getRequestArray()
        assert.equal(requests[0].approvalCount, 0)
      });
    })
    describe("execute request", function () {
      beforeEach(async () => {
        await campaign.contribute({value: ethers.utils.parseEther("2.0")})
        await campaign.connect(accountA).contribute({value: ethers.utils.parseEther("2.0")})
        await campaign.connect(accountB).contribute({value: ethers.utils.parseEther("2.0")})

        await campaign.createRequest("buy laptop",ethers.utils.parseEther("2.0"), accountC.address)
        await campaign.createRequest("buy clothes",ethers.utils.parseEther("2.0"), accountD.address)

        await campaign.approveRequest(0)
        await campaign.connect(accountA).approveRequest(0)
        await campaign.connect(accountB).approveRequest(0)
      })
      it("should revert if there is not enough approvals", async function () {
        await expect(campaign.excuteRequest(1)).to.be.revertedWith("Campaign: Not enough aprrovals")        
      });
      it("should revert if the request is aldready executed", async function () {
        await campaign.excuteRequest(0)
        await (expect(campaign.excuteRequest(0))).to.be.revertedWith("Campaign: The request already executed")        
      });
      it("should execute correctly", async function () {
        await campaign.excuteRequest(0)
        expect (await campaign.getTotalContribution()).to.be.equal(ethers.utils.parseEther("4.0"))
      });
    }) 
  })
})