// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract FreelancerEscrow {
    address public owner;
    uint256 public jobCounter;
    uint256 public applicationFeeWei = 1e15; // 0.001 ETH varsayılan

    struct Application {
        address applicant;
        string message;
        uint256 bidWei; // adayın teklif ettiği tutar
    }

    struct Job {
        uint256 id;
        address employer;
        string title;
        string description;
        uint256 budgetWei;   // işverenin kilitlediği bütçe
        bool isOpen;         // hire edilene kadar true
        address freelancer;  // hire edilen kişi
        bool submitted;
        bool paid;
        // başvurular
        address[] applicants;
        mapping(address => Application) appDetail;
    }

    mapping(uint256 => Job) private jobs;

    event JobPosted(uint256 indexed jobId, address indexed employer, uint256 budgetWei);
    event JobCancelled(uint256 indexed jobId, address indexed employer);
    event Applied(uint256 indexed jobId, address indexed applicant);
    event Hired(uint256 indexed jobId, address indexed freelancer);
    event WorkSubmitted(uint256 indexed jobId, address indexed freelancer);
    event WorkApproved(uint256 indexed jobId, address indexed employer);
    event FundsReleased(uint256 indexed jobId, address indexed to, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {}

    function setApplicationFeeWei(uint256 fee) external {
        require(msg.sender == owner, "only owner");
        applicationFeeWei = fee;
    }

    function postJob(string calldata title, string calldata description) external payable returns (uint256) {
        require(msg.value > 0, "budget required");
        jobCounter++;
        Job storage j = jobs[jobCounter];
        j.id = jobCounter;
        j.employer = msg.sender;
        j.title = title;
        j.description = description;
        j.budgetWei = msg.value;
        j.isOpen = true;
        emit JobPosted(jobCounter, msg.sender, msg.value);
        return jobCounter;
    }

    function cancelJob(uint256 jobId) external {
        Job storage j = jobs[jobId];
        require(j.id != 0, "no job");
        require(msg.sender == j.employer, "only employer");
        require(j.isOpen && j.freelancer == address(0), "cannot cancel");
        j.isOpen = false;
        uint256 refund = j.budgetWei;
        j.budgetWei = 0;
        (bool ok,) = payable(j.employer).call{value: refund}("");
        require(ok, "refund failed");
        emit JobCancelled(jobId, j.employer);
    }

    // YENİ: mesaj + teklif ile başvuru
    function applyToJob(uint256 jobId, string calldata message, uint256 bidWei) external payable {
        Job storage j = jobs[jobId];
        require(j.id != 0 && j.isOpen, "job closed");
        require(msg.value == applicationFeeWei, "fee mismatch");
        require(j.appDetail[msg.sender].applicant == address(0), "already applied");
        j.applicants.push(msg.sender);
        j.appDetail[msg.sender] = Application({
            applicant: msg.sender,
            message: message,
            bidWei: bidWei
        });
        emit Applied(jobId, msg.sender);
    }

    function getApplicantsCount(uint256 jobId) external view returns (uint256) {
        return jobs[jobId].applicants.length;
    }

    // YENİ: başvuru detaylarını döndür
    function getApplications(uint256 jobId) external view returns (
        address[] memory applicants,
        string[] memory messages,
        uint256[] memory bidsWei
    ) {
        Job storage j = jobs[jobId];
        uint256 n = j.applicants.length;
        applicants = new address[](n);
        messages  = new string[](n);
        bidsWei   = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            address a = j.applicants[i];
            Application storage ap = j.appDetail[a];
            applicants[i] = a;
            messages[i]   = ap.message;
            bidsWei[i]    = ap.bidWei;
        }
    }

    function hireApplicant(uint256 jobId, address applicant) external {
        Job storage j = jobs[jobId];
        require(msg.sender == j.employer, "only employer");
        require(j.isOpen && j.freelancer == address(0), "already hired/closed");
        require(j.appDetail[applicant].applicant == applicant, "not an applicant");
        j.freelancer = applicant;
        emit Hired(jobId, applicant);
    }

    function submitWork(uint256 jobId) external {
        Job storage j = jobs[jobId];
        require(msg.sender == j.freelancer, "only freelancer");
        require(j.freelancer != address(0) && j.isOpen, "invalid");
        j.submitted = true;
        emit WorkSubmitted(jobId, msg.sender);
    }

    function approveWork(uint256 jobId) external {
        Job storage j = jobs[jobId];
        require(msg.sender == j.employer, "only employer");
        require(j.submitted && !j.paid, "not ready");
        j.isOpen = false;
        j.paid = true;
        uint256 amount = j.budgetWei;
        j.budgetWei = 0;
        (bool ok,) = payable(j.freelancer).call{value: amount}("");
        require(ok, "payout failed");
        emit WorkApproved(jobId, msg.sender);
        emit FundsReleased(jobId, j.freelancer, amount);
    }

    // Görünümler
    struct JobPreview {
        uint256 id;
        address employer;
        string title;
        uint256 budgetWei;
        bool isOpen;
        address freelancer;
        bool submitted;
        bool paid;
    }

    function getJobPreview(uint256 jobId) external view returns (JobPreview memory preview, address[] memory applicants) {
        Job storage j = jobs[jobId];
        preview = JobPreview({
            id: j.id,
            employer: j.employer,
            title: j.title,
            budgetWei: j.budgetWei,
            isOpen: j.isOpen,
            freelancer: j.freelancer,
            submitted: j.submitted,
            paid: j.paid
        });
        applicants = j.applicants;
    }

    // Biriken başvuru ücretleri (owner çekebilir)
    function accumulatedApplicationFees() external view returns (uint256) {
        return address(this).balance; // basit yaklaşım: tüm kalan
    }

    function withdrawApplicationFees(address payable to) external {
        require(msg.sender == owner, "only owner");
        uint256 bal = address(this).balance;
        (bool ok,) = to.call{value: bal}("");
        require(ok, "withdraw failed");
    }
}