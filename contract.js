// contract.js — ES Module

// ---- Sepolia Chain Id (hex) ----
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

// ---- Deployed Contract Address (senin verdiğin) ----
export const CONTRACT_ADDRESS = "0x3aEaCE2225e7846be6840B2757090D356452fF7D";

// ---- ABI (senin verdiğin güncel sürüm) ----
export const ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "anonymous": false, "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "jobId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "applicant", "type": "address" }
    ], "name": "Applied", "type": "event"
  },
  { "anonymous": false, "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "jobId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ], "name": "FundsReleased", "type": "event"
  },
  { "anonymous": false, "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "jobId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "freelancer", "type": "address" }
    ], "name": "Hired", "type": "event"
  },
  { "anonymous": false, "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "jobId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "employer", "type": "address" }
    ], "name": "JobCancelled", "type": "event"
  },
  { "anonymous": false, "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "jobId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "employer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "budgetWei", "type": "uint256" }
    ], "name": "JobPosted", "type": "event"
  },
  { "anonymous": false, "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "jobId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "employer", "type": "address" }
    ], "name": "WorkApproved", "type": "event"
  },
  { "anonymous": false, "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "jobId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "freelancer", "type": "address" }
    ], "name": "WorkSubmitted", "type": "event"
  },

  { "inputs": [], "name": "accumulatedApplicationFees", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "applicationFeeWei", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },

  { "inputs": [
      { "internalType": "uint256", "name": "jobId", "type": "uint256" },
      { "internalType": "string",  "name": "message", "type": "string" },
      { "internalType": "uint256", "name": "bidWei", "type": "uint256" }
    ],
    "name": "applyToJob", "outputs": [], "stateMutability": "payable", "type": "function"
  },
  { "inputs": [{ "internalType": "uint256", "name": "jobId", "type": "uint256" }], "name": "approveWork", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "jobId", "type": "uint256" }], "name": "cancelJob",   "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  { "inputs": [{ "internalType": "uint256", "name": "jobId", "type": "uint256" }], "name": "getApplicantsCount", "outputs": [{ "internalType":"uint256","name":"","type":"uint256"}], "stateMutability":"view","type":"function" },

  { "inputs": [{ "internalType": "uint256", "name": "jobId", "type": "uint256" }],
    "name": "getApplications",
    "outputs": [
      { "internalType": "address[]", "name": "applicants", "type": "address[]" },
      { "internalType": "string[]",  "name": "messages",   "type": "string[]" },
      { "internalType": "uint256[]", "name": "bidsWei",    "type": "uint256[]" }
    ],
    "stateMutability": "view", "type": "function"
  },

  { "inputs": [{ "internalType": "uint256", "name": "jobId", "type": "uint256" }],
    "name": "getJobPreview",
    "outputs": [
      { "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "address", "name": "employer", "type": "address" },
          { "internalType": "string",  "name": "title", "type": "string" },
          { "internalType": "uint256", "name": "budgetWei", "type": "uint256" },
          { "internalType": "bool",    "name": "isOpen", "type": "bool" },
          { "internalType": "address", "name": "freelancer", "type": "address" },
          { "internalType": "bool",    "name": "submitted", "type": "bool" },
          { "internalType": "bool",    "name": "paid", "type": "bool" }
        ], "internalType": "struct FreelancerEscrow.JobPreview", "name": "preview", "type": "tuple"
      },
      { "internalType": "address[]", "name": "applicants", "type": "address[]" }
    ],
    "stateMutability": "view", "type": "function"
  },

  { "inputs": [
      { "internalType": "uint256", "name": "jobId", "type": "uint256" },
      { "internalType": "address", "name": "applicant", "type": "address" }
    ],
    "name": "hireApplicant", "outputs": [], "stateMutability": "nonpayable", "type": "function"
  },

  { "inputs": [], "name": "jobCounter", "outputs": [{ "internalType":"uint256","name":"","type":"uint256"}], "stateMutability":"view","type":"function" },
  { "inputs": [], "name": "owner",      "outputs": [{ "internalType":"address","name":"","type":"address"}], "stateMutability":"view","type":"function" },

  { "inputs": [
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" }
    ],
    "name": "postJob", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "payable", "type": "function"
  },

  { "inputs": [{ "internalType": "uint256", "name": "fee", "type": "uint256" }], "name": "setApplicationFeeWei", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "jobId", "type": "uint256" }], "name": "submitWork", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address payable", "name": "to", "type": "address" }], "name": "withdrawApplicationFees", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  { "stateMutability": "payable", "type": "receive" }
];
