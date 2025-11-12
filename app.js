// app.js  — ES Module
import { CONTRACT_ADDRESS, ABI, SEPOLIA_CHAIN_ID_HEX } from "./contract.js";

/* ====================== Yardımcılar (UI) ====================== */
const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`[UI] element not found: #${id}`);
  return el;
};
const show = (id, on = true, display = "inline-block") => {
  const el = $(id);
  if (el) el.style.display = on ? display : "none";
};
const setText = (id, text) => {
  const el = $(id);
  if (el) el.textContent = text;
};
const htmlSafe = (s) =>
  (s ?? "")
    .toString()
    .replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const fmtEth = (wei) => {
  try { return ethers.formatEther(wei); } catch { return "0"; }
};
function toast(msg, kind = "ok", ms = 2600) {
  const wrap = $("toasts");
  if (!wrap) return alert(msg);
  const el = document.createElement("div");
  el.className = `toast ${kind === "err" ? "err" : kind === "ok" ? "ok" : ""}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/* ====================== Global Durum ====================== */
let provider, signer, contract, userAddress;
const state = {
  allJobs: [],
  employerHasOpenJobs: false,
};
const pending = new Set(); // "action:jobId" -> render'da butonlar disable

const roleKey = (addr) => `role:${addr.toLowerCase()}`;
const getRole = (addr) => { try { return localStorage.getItem(roleKey(addr)); } catch { return null; } };
const setRole = (addr, role) => { try { localStorage.setItem(roleKey(addr), role); } catch {} };
const clearRole = (addr) => { try { localStorage.removeItem(roleKey(addr)); } catch {} };

/* ====================== Tema ====================== */
function initTheme() {
  const key = "theme";
  const saved = localStorage.getItem(key) || "light";
  document.documentElement.setAttribute("data-theme", saved);
  const themeBtn = $("theme");
  if (themeBtn) {
    themeBtn.onclick = () => {
      const cur = document.documentElement.getAttribute("data-theme");
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(key, next);
    };
  }
}

/* ====================== Cüzdan / Ağ ====================== */
async function ensureNetwork() {
  const chainId = await provider.send("eth_chainId", []);
  if (chainId !== SEPOLIA_CHAIN_ID_HEX) {
    await provider.send("wallet_switchEthereumChain", [{ chainId: SEPOLIA_CHAIN_ID_HEX }]);
  }
}
async function connect() {
  try {
    if (!window.ethereum) { toast("MetaMask gerekli", "err"); return; }
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    await ensureNetwork();

    signer = await provider.getSigner();
    userAddress = (await signer.getAddress()).toLowerCase();
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    setText("addr", `Address: ${userAddress}`);
    show("changeRole", true);
    show("logout", true);

    const role = getRole(userAddress);
    if (!role) {
      const modal = $("roleModal"); if (modal) modal.style.display = "flex";
    } else {
      updateRoleUI(role);
      await refreshAll();
      toast("Cüzdan bağlandı", "ok");
    }
  } catch (err) {
    console.error(err);
    toast("Bağlantı hatası", "err");
  }
}

/* ====================== Rol Yönetimi ====================== */
function updateRoleUI(role) {
  const chip = $("roleChip");
  if (chip) { chip.style.display = "inline-block"; chip.textContent = `Rol: ${role}`; }
  const isEmp = role === "employer";
  const empTools = $("employerTools"); if (empTools) empTools.style.display = isEmp ? "block" : "none";
  const empMine = $("employerMine"); if (empMine) empMine.style.display = isEmp ? "block" : "none";
  const frBoards = $("freelancerBoards"); if (frBoards) frBoards.style.display = !isEmp ? "block" : "none";
  const lists = $("lists"); if (lists) lists.style.display = "block";
  const title = $("listTitle"); if (title) title.innerText = isEmp ? "Tüm Açık İlanlar" : "Açık İlanlar";
}

window.saveRoleForWallet = async (nextRole) => {
  if (!userAddress) { toast("Önce cüzdan bağla", "err"); return; }
  if (nextRole !== "employer" && nextRole !== "freelancer") return;
  const prevRole = getRole(userAddress);
  if (prevRole === "employer" && nextRole !== "employer" && state.employerHasOpenJobs) {
    toast("Açık ilanın varken rol değiştiremezsin", "err"); return;
  }
  setRole(userAddress, nextRole);
  const modal = $("roleModal"); if (modal) modal.style.display = "none";
  updateRoleUI(nextRole);
  await refreshAll();
  toast(`Rol: ${nextRole}`, "ok");
};

/* ====================== Pending Helper ====================== */
function pendKey(action, id) { return `${action}:${id}`; }
function isPending(action, id) { return pending.has(pendKey(action, id)); }
function setPending(action, id, on) {
  const k = pendKey(action, id);
  on ? pending.add(k) : pending.delete(k);
}

/* ====================== Zincir İşlemleri ====================== */
async function postJob() {
  try {
    const role = getRole(userAddress);
    if (role !== "employer") { toast("Bu işlem için rolün işveren olmalı", "err"); return; }
    const elTitle = $("title"), elDesc = $("desc"), elBudget = $("budget");
    const title = elTitle?.value.trim();
    const desc  = elDesc?.value.trim();
    const budgetEth = elBudget?.value.trim();
    if (!title || !budgetEth) { toast("Başlık ve bütçe gerekli", "err"); return; }
    const budgetWei = ethers.parseEther(budgetEth);

    setPending("post", 0, true);
    const tx = await contract.postJob(title, desc, { value: budgetWei });
    await tx.wait();
    if (elTitle) elTitle.value = "";
    if (elDesc) elDesc.value = "";
    if (elBudget) elBudget.value = "";
    await refreshAll();
    toast("İlan yayınlandı ve bütçe kilitlendi", "ok");
  } catch (e) {
    console.error(e);
    toast("İlan yayınlanamadı", "err");
  } finally {
    setPending("post", 0, false);
    renderAfterState();
  }
}

window.applyTo = async (id) => {
  try {
    const role = getRole(userAddress);
    if (role !== "freelancer") { toast("Başvurmak için freelancer olmalısın", "err"); return; }
    if (isPending("apply", id)) return;
    const message = prompt("Başvuru mesajın (kısa):", "Merhaba, bu işi yapabilirim.");
    if (message === null) return;
    const bidEth = prompt("Teklifin (ETH):", "0.02");
    if (bidEth === null || bidEth.trim() === "") return;
    let bidWei;
    try { bidWei = ethers.parseEther(bidEth.trim()); }
    catch { toast("Geçersiz teklif", "err"); return; }

    const fee = await contract.applicationFeeWei();
    setPending("apply", id, true);
    const tx = await contract.applyToJob(id, message, bidWei, { value: fee });
    await tx.wait();
    await refreshAll();
    toast("Başvuru gönderildi", "ok");
  } catch (e) {
    console.error(e);
    toast("Başvuru başarısız", "err");
  } finally {
    setPending("apply", id, false);
    renderAfterState();
  }
};

window.viewApplicants = async (id) => {
  try {
    if (isPending("hire", id)) return;
    const gp = await contract.getJobPreview(id);
    const preview = gp.preview || gp[0];
    if (preview.employer.toLowerCase() !== userAddress) { toast("Sadece işveren görebilir", "err"); return; }

    const apps = await contract.getApplications(id);
    const applicants = apps.applicants || apps[0] || [];
    const messages   = apps.messages   || apps[1] || [];
    const bidsWei    = apps.bidsWei    || apps[2] || [];

    if (!applicants.length) { toast("Başvuru yok", "ok"); return; }
    const lines = applicants.map((a, i)=> {
      const bid = fmtEth(bidsWei[i]);
      const msg = messages[i] || "";
      return `${i+1}) ${a}\n   Teklif: ${bid} ETH\n   Mesaj: ${msg}`;
    }).join("\n\n");

    const picked = prompt(
      `Başvuranlar (#${id}):\n\n${lines}\n\n` +
      "İşe alacağın kişinin tam adresini veya sıra numarasını gir (iptal için boş bırak):"
    );
    if (!picked) return;

    let target;
    if (/^\d+$/.test(picked.trim())) {
      const idx = parseInt(picked.trim(),10)-1;
      if (idx < 0 || idx >= applicants.length) { toast("Geçersiz sıra", "err"); return; }
      target = applicants[idx];
    } else target = picked.trim();

    setPending("hire", id, true);
    const tx = await contract.hireApplicant(id, target);
    await tx.wait();
    await refreshAll();
    toast("Freelancer işe alındı", "ok");
  } catch (e) {
    console.error(e);
    toast("Hire işlemi başarısız", "err");
  } finally {
    setPending("hire", id, false);
    renderAfterState();
  }
};

window.submitWork = async (id) => {
  try {
    if (isPending("submit", id)) return;
    setPending("submit", id, true);
    const tx = await contract.submitWork(id);
    await tx.wait();
    await refreshAll();
    toast("İş teslim edildi", "ok");
  } catch (e) {
    console.error(e);
    toast("Teslim bildirimi başarısız", "err");
  } finally {
    setPending("submit", id, false);
    renderAfterState();
  }
};

window.approve = async (id) => {
  try {
    if (isPending("approve", id)) return;
    const gp = await contract.getJobPreview(id);
    const preview = gp.preview || gp[0];
    if (preview.employer.toLowerCase() !== userAddress) { toast("Sadece işveren onaylayabilir", "err"); return; }
    setPending("approve", id, true);
    const tx = await contract.approveWork(id);
    await tx.wait();
    await refreshAll();
    toast("Ödeme serbest bırakıldı", "ok");
  } catch (e) {
    console.error(e);
    toast("Onay başarısız", "err");
  } finally {
    setPending("approve", id, false);
    renderAfterState();
  }
};

window.cancelJob = async (id) => {
  try {
    if (isPending("cancel", id)) return;
    const ok = confirm(`#${id} ilanını iptal etmek istiyor musun?`);
    if (!ok) return;
    setPending("cancel", id, true);
    const tx = await contract.cancelJob(id);
    await tx.wait();
    await refreshAll();
    toast("İlan iptal edildi ve bütçe iade edildi", "ok");
  } catch (e) {
    console.error(e);
    toast("İptal başarısız", "err");
  } finally {
    setPending("cancel", id, false);
    renderAfterState();
  }
};

/* ====================== Listeleme / Render ====================== */
async function refreshAll() {
  if (!contract) return;
  const count = Number(await contract.jobCounter());
  const zero = ethers.ZeroAddress.toLowerCase();
  const role = getRole(userAddress);

  const all = [];
  for (let i = 1; i <= count; i++) {
    try {
      const gp = await contract.getJobPreview(i);
      const preview = gp.preview || gp[0];
      const applicants = (gp.applicants || gp[1] || []).map((a) => a.toLowerCase());
      const j = {
        id: Number(preview.id),
        employer: (preview.employer || ethers.ZeroAddress).toLowerCase(),
        title: preview.title,
        budgetWei: preview.budgetWei,
        isOpen: !!preview.isOpen,
        freelancer: (preview.freelancer || ethers.ZeroAddress).toLowerCase(),
        submitted: !!preview.submitted,
        paid: !!preview.paid,
        applicants,
      };
      all.push(j);
    } catch { /* skip */ }
  }

  state.allJobs = all;
  state.employerHasOpenJobs = all.some((j) => j.employer === userAddress && j.isOpen === true);

  // Badge + rol değiştir kilidi
  const openCount = all.filter((j)=> j.employer === userAddress && j.isOpen).length;
  const openBadge = $("openBadge");
  if (openBadge) {
    if (openCount > 0) { openBadge.style.display = "inline-block"; openBadge.textContent = `Açık ilan: ${openCount}`; }
    else { openBadge.style.display = "none"; openBadge.textContent = ""; }
  }
  const changeBtn = $("changeRole");
  if (changeBtn) {
    if (getRole(userAddress) === "employer" && state.employerHasOpenJobs) {
      changeBtn.disabled = true; changeBtn.title = "Açık ilan varken rol değiştirilemez";
    } else { changeBtn.disabled = false; changeBtn.title = ""; }
  }

  // Listeleri çiz
  const zeroAddr = ethers.ZeroAddress.toLowerCase();
  const roleNow = getRole(userAddress);

  const openJobs = all.filter((j) => j.isOpen && j.freelancer === zeroAddr);
  renderJobs(openJobs, $("jobs"), roleNow);

  if (roleNow === "employer") {
    const mine = all.filter((j) => j.employer === userAddress);
    renderJobs(mine, $("myJobs"), roleNow, true);
  } else {
    const myApps = all.filter((j) => j.applicants.includes(userAddress));
    renderSimpleList(myApps, $("myApps"), (j) => {
      const hired = j.freelancer !== zeroAddr;
      return `#${j.id} · ${fmtEth(j.budgetWei)} ETH · ${hired ? "<span class='tag ok'>Hired</span>" : "<span class='tag'>Pending</span>"}`;
    });
    const assignments = all.filter((j) => j.freelancer === userAddress);
    renderSimpleList(assignments, $("myAssignments"), (j) => {
      const act = j.submitted
        ? "<span class=\"tag ok\">Submitted</span>"
        : `<button class="btn" onclick="submitWork(${j.id})" ${isPending("submit", j.id) ? "disabled" : ""}>Teslim Et</button>`;
      return `#${j.id} · ${fmtEth(j.budgetWei)} ETH · ${act}`;
    });
  }
}

function renderJobs(list, container, role, onlyMine = false) {
  if (!container) return;
  if (!list || !list.length) { container.innerHTML = `<div class="muted">Kayıt yok</div>`; return; }

  const zero = ethers.ZeroAddress.toLowerCase();
  container.innerHTML = list.map((j) => {
    const youAreEmployer = j.employer === (userAddress || "");
    const youAreFreelancer = j.freelancer === (userAddress || "");

    let status = "";
    if (!j.isOpen && !j.paid && j.freelancer === zero) status = `<span class="tag danger">İptal</span>`;
    else status = j.paid ? `<span class="tag ok">Ödendi</span>`
                         : j.submitted ? `<span class="tag">Teslim edildi</span>`
                         : j.freelancer !== zero ? `<span class="tag">Atandı</span>`
                         : `<span class="tag">Açık</span>`;

    let actions = "";
    if (role === "freelancer" && j.isOpen && j.freelancer === zero) {
      actions += `<button class="btn" onclick="applyTo(${j.id})" ${isPending("apply", j.id) ? "disabled" : ""}>Başvur (mesaj+teklif)</button>`;
    }
    if (role === "employer" && youAreEmployer) {
      if (j.freelancer === zero && j.isOpen) {
        actions += `<button class="btn secondary" onclick="viewApplicants(${j.id})" ${isPending("hire", j.id) ? "disabled" : ""}>Başvuruları Gör / Hire</button>`;
        actions += ` <button class="btn ghost" onclick="cancelJob(${j.id})" ${isPending("cancel", j.id) ? "disabled" : ""}>İptal Et</button>`;
      }
      if (j.freelancer !== zero && j.submitted && !j.paid) {
        actions += ` <button class="btn" onclick="approve(${j.id})" ${isPending("approve", j.id) ? "disabled" : ""}>Onayla & Öde</button>`;
      }
    }
    if (youAreFreelancer && !j.submitted && j.freelancer !== zero) {
      actions += ` <button class="btn" onclick="submitWork(${j.id})" ${isPending("submit", j.id) ? "disabled" : ""}>Teslim Et</button>`;
    }

    // Kart gövdesi
    const details = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div style="font-weight:600">#${j.id} ${htmlSafe(j.title || "")}</div>
        <div>${status}</div>
      </div>
      <div class="muted">İşveren: ${j.employer}</div>
      <div class="muted">Freelancer: ${j.freelancer}</div>
      <div class="muted">Bütçe: <b>${fmtEth(j.budgetWei)} ETH</b> · Açık: ${j.isOpen}</div>
      <div class="muted">Başvuru: ${j.applicants.length}</div>
      <div class="spacer"></div>
      <div>${actions}</div>
    `;

    return `<div class="card">${details}</div>`;
  }).join("");
}

function renderSimpleList(list, container, templateFn) {
  if (!container) return;
  if (!list || !list.length) { container.innerHTML = `<div class="muted">Kayıt yok</div>`; return; }
  container.innerHTML = list.map((j) => `<div class="card" style="margin-bottom:8px">${templateFn(j)}</div>`).join("");
}

function renderAfterState() {
  const roleNow = getRole(userAddress);
  const zeroAddr = ethers.ZeroAddress.toLowerCase();

  const openJobs = state.allJobs.filter((j) => j.isOpen && j.freelancer === zeroAddr);
  renderJobs(openJobs, $("jobs"), roleNow);

  if (roleNow === "employer") {
    const mine = state.allJobs.filter((j) => j.employer === userAddress);
    renderJobs(mine, $("myJobs"), roleNow, true);
  } else {
    const myApps = state.allJobs.filter((j) => j.applicants.includes(userAddress));
    renderSimpleList(myApps, $("myApps"), (j) => {
      const hired = j.freelancer !== zeroAddr;
      return `#${j.id} · ${fmtEth(j.budgetWei)} ETH · ${hired ? "<span class='tag ok'>Hired</span>" : "<span class='tag'>Pending</span>"}`;
    });
    const assignments = state.allJobs.filter((j) => j.freelancer === userAddress);
    renderSimpleList(assignments, $("myAssignments"), (j) => {
      const act = j.submitted
        ? "<span class=\"tag ok\">Submitted</span>"
        : `<button class="btn" onclick="submitWork(${j.id})" ${isPending("submit", j.id) ? "disabled" : ""}>Teslim Et</button>`;
      return `#${j.id} · ${fmtEth(j.budgetWei)} ETH · ${act}`;
    });
  }
}

/* ====================== Boot ====================== */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  const connectBtn = $("connect");
  if (connectBtn) connectBtn.onclick = connect;

  const logoutBtn = $("logout");
  if (logoutBtn) logoutBtn.onclick = () => { if (userAddress) clearRole(userAddress); location.reload(); };

  const changeRoleBtn = $("changeRole");
  if (changeRoleBtn) changeRoleBtn.onclick = () => {
    const currentRole = getRole(userAddress);
    if (currentRole === "employer" && state.employerHasOpenJobs) {
      toast("Açık ilanın varken rolü değiştiremezsin", "err");
      return;
    }
    const modal = $("roleModal"); if (modal) modal.style.display = "flex";
  };

  const postBtn = $("postJob");
  if (postBtn) postBtn.onclick = postJob;

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => location.reload());
    window.ethereum.on("chainChanged", () => location.reload());
  }
});
