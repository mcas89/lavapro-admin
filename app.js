import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collectionGroup, getDocs, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA0j5-JInS16Ftb1tMm6fT50swMpUA1z8w",
  authDomain: "lavapro-2e1d5.firebaseapp.com",
  projectId: "lavapro-2e1d5",
  storageBucket: "lavapro-2e1d5.firebasestorage.app",
  messagingSenderId: "632061733139",
  appId: "1:632061733139:web:f99b47991ca2adc14492e6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = "marcos.mcas89@gmail.com";
let allTenantsData = [];

// Elements
const loginScreen = document.getElementById("loginScreen");
const dashboardScreen = document.getElementById("dashboardScreen");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const tenantsList = document.getElementById("tenantsList");
const refreshBtn = document.getElementById("refreshBtn");
const searchInput = document.getElementById("searchInput");
const tenantCount = document.getElementById("tenantCount");

// 1. Auth
onAuthStateChanged(auth, (user) => {
    if (user && user.email === ADMIN_EMAIL) {
        loginScreen.classList.add("hidden");
        dashboardScreen.classList.remove("hidden");
        loadTenants();
    } else if (user) {
        loginError.textContent = "Acesso Negado.";
        loginError.classList.remove("hidden");
        signOut(auth);
    } else {
        loginScreen.classList.remove("hidden");
        dashboardScreen.classList.add("hidden");
    }
});

// 2. Login
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    loginError.classList.add("hidden");
    
    if (email !== ADMIN_EMAIL) {
        loginError.textContent = "Acesso Negado.";
        loginError.classList.remove("hidden");
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        loginError.textContent = "Senha incorreta.";
        loginError.classList.remove("hidden");
    }
});

logoutBtn.addEventListener("click", () => signOut(auth));
refreshBtn.addEventListener("click", () => loadTenants());

searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allTenantsData.filter(t => 
        t.companyName.toLowerCase().includes(term) || 
        t.ownerName.toLowerCase().includes(term) ||
        t.email.toLowerCase().includes(term)
    );
    renderTenants(filtered);
});

// 4. Load
async function loadTenants() {
    tenantsList.innerHTML = `<li class="col-span-full p-12 text-center text-gray-500 flex flex-col items-center gap-3"><i data-lucide="loader-2" class="w-8 h-8 animate-spin text-blue-500"></i> Buscando clientes...</li>`;
    if (window.lucide) lucide.createIcons();
    allTenantsData = [];
    
    try {
        const settingsQuery = await getDocs(collectionGroup(db, 'settings'));
        
        settingsQuery.forEach((docSnap) => {
            if (docSnap.id === 'profile') {
                const data = docSnap.data();
                const uid = docSnap.ref.parent.parent.id; 
                
                let isValid = false;
                let statusText = '';
                let statusClass = '';
                let statusIcon = '';
                
                if (data.validUntil) {
                    const validDate = new Date(data.validUntil);
                    const now = new Date();
                    isValid = validDate > now;
                    const dateStr = validDate.toLocaleDateString('pt-BR');
                    
                    if (isValid) {
                        statusText = `Ativo até ${dateStr}`;
                        statusClass = 'text-green-700 bg-green-100 border-green-200';
                        statusIcon = 'check-circle-2';
                    } else {
                        statusText = `Vencido (${dateStr})`;
                        statusClass = 'text-red-700 bg-red-100 border-red-200';
                        statusIcon = 'alert-circle';
                    }
                } else {
                    statusText = `Vitalício / Sem Vencimento`;
                    statusClass = 'text-blue-700 bg-blue-100 border-blue-200';
                    statusIcon = 'award';
                    isValid = true;
                }

                // Cálculo de tempo de casa
                const payments = data.paymentHistory || [];
                const firstDate = payments.length > 0 ? new Date(payments[0].date) : (data.createdAt ? new Date(data.createdAt) : new Date());
                const diffTime = Math.abs(new Date() - firstDate);
                const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
                
                allTenantsData.push({
                    uid,
                    companyName: data.company?.name || "Sem Nome",
                    ownerName: data.company?.owner || "—",
                    email: data.company?.email || "Email não preenchido",
                    phone: data.company?.phone || "",
                    isValid,
                    statusText,
                    statusClass,
                    statusIcon,
                    validUntil: data.validUntil,
                    payments: payments.reverse(), // most recent first
                    monthsActive: diffMonths,
                    startDate: firstDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
                });
            }
        });

        allTenantsData.sort((a, b) => {
            if (a.isValid === b.isValid) return a.companyName.localeCompare(b.companyName);
            return a.isValid ? -1 : 1;
        });

        renderTenants(allTenantsData);
        
    } catch (error) {
        tenantsList.innerHTML = `<li class="col-span-full p-4 text-center text-red-500">Erro: ${error.message}</li>`;
    }
}

window.toggleHistory = (uid) => {
    const el = document.getElementById(`history-${uid}`);
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
};

function renderTenants(dataArray) {
    tenantCount.textContent = `${dataArray.length} Clientes`;
    
    if (dataArray.length === 0) {
        tenantsList.innerHTML = `<li class="col-span-full p-12 text-center text-gray-400 flex flex-col items-center gap-2"><i data-lucide="search-x" class="w-8 h-8"></i> Nenhum resultado.</li>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    let html = '';
    dataArray.forEach(t => {
        const cleanPhone = t.phone ? t.phone.replace(/\D/g, '') : '';
        const wppLink = cleanPhone ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(t.ownerName)}%2C%20aqui%20%C3%A9%20do%20suporte%20LavaPro.` : '#';
        
        let paymentsHtml = '';
        if (t.payments.length === 0) {
            paymentsHtml = `<p class="text-[11px] text-gray-400 text-center py-1.5">Nenhum pagamento registrado.</p>`;
        } else {
            t.payments.forEach(p => {
                const pDate = new Date(p.date).toLocaleDateString('pt-BR');
                paymentsHtml += `
                    <div class="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                        <span class="text-[11px] text-gray-500 flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${pDate}</span>
                        <span class="text-[11px] font-semibold text-green-600">R$ ${p.value?.toFixed(2).replace('.', ',')}</span>
                    </div>
                `;
            });
        }

        html += `
            <li class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition hover:shadow-md text-sm">
                <!-- Card Header -->
                <div class="p-3 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                    <div>
                        <h3 class="font-bold text-gray-900 text-base leading-tight">${t.companyName}</h3>
                        <p class="text-xs text-gray-700 mt-0.5">${t.ownerName}</p>
                        <p class="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1"><i data-lucide="mail" class="w-3 h-3"></i> ${t.email}</p>
                    </div>
                    ${cleanPhone ? `
                    <a href="${wppLink}" target="_blank" class="flex-shrink-0 bg-[#25D366] hover:bg-[#128C7E] text-white p-1.5 rounded-full transition shadow-sm" title="Chamar no WhatsApp">
                        <i data-lucide="message-circle" class="w-4 h-4"></i>
                    </a>
                    ` : `
                    <div class="flex-shrink-0 bg-gray-200 text-gray-400 p-1.5 rounded-full cursor-not-allowed" title="Sem telefone">
                        <i data-lucide="phone-off" class="w-4 h-4"></i>
                    </div>
                    `}
                </div>
                
                <!-- Card Body -->
                <div class="p-3 flex-1 flex flex-col gap-3">
                    
                    <!-- Status & Metrics -->
                    <div class="grid grid-cols-2 gap-2">
                        <div class="col-span-2 flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold border ${t.statusClass}">
                            <i data-lucide="${t.statusIcon}" class="w-3 h-3"></i> ${t.statusText}
                        </div>
                        
                        <div class="bg-gray-50 p-1.5 rounded border border-gray-100">
                            <p class="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Início</p>
                            <p class="text-[11px] font-semibold text-gray-700">${t.startDate}</p>
                        </div>
                        <div class="bg-gray-50 p-1.5 rounded border border-gray-100">
                            <p class="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Tempo</p>
                            <p class="text-[11px] font-semibold text-gray-700">${t.monthsActive} ${t.monthsActive === 1 ? 'mês' : 'meses'}</p>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="grid grid-cols-3 gap-1.5 mt-auto">
                        <button onclick="addDays('${t.uid}', 7)" title="Adicionar 7 Dias" class="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded transition">
                            <span class="text-[11px] font-bold">+7d</span>
                        </button>
                        <button onclick="addDays('${t.uid}', 15)" title="Adicionar 15 Dias" class="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded transition">
                            <span class="text-[11px] font-bold">+15d</span>
                        </button>
                        <button onclick="addDays('${t.uid}', 30)" title="Adicionar 30 Dias" class="flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded transition">
                            <span class="text-[11px] font-bold">+30d</span>
                        </button>
                        
                        <button onclick="blockTenant('${t.uid}')" title="Bloquear Imediatamente" class="col-span-1 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 py-1.5 rounded transition">
                            <i data-lucide="lock" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="registerPayment('${t.uid}', '${t.validUntil}')" title="Registrar Pagamento" class="col-span-2 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded transition shadow-sm">
                            <i data-lucide="dollar-sign" class="w-3.5 h-3.5"></i> <span class="text-[11px] font-bold">Pagar (+30d)</span>
                        </button>
                    </div>

                    <!-- History Toggle -->
                    <div class="border-t border-gray-100 pt-2">
                        <button onclick="toggleHistory('${t.uid}')" class="w-full flex justify-between items-center text-[11px] font-semibold text-gray-500 hover:text-gray-700 transition">
                            Ver Pagamentos
                            <i data-lucide="chevron-down" class="w-3 h-3"></i>
                        </button>
                        
                        <div id="history-${t.uid}" class="hidden mt-2 max-h-24 overflow-y-auto history-scroll pr-1">
                            ${paymentsHtml}
                        </div>
                    </div>
                </div>
            </li>
        `;
    });
    
    tenantsList.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

// Custom UI Functions
function showConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById("confirmModal");
        document.getElementById("confirmTitle").textContent = title;
        document.getElementById("confirmMessage").textContent = message;
        modal.classList.remove("hidden");

        const btnOk = document.getElementById("confirmOkBtn");
        const btnCancel = document.getElementById("confirmCancelBtn");
        
        const cleanup = () => {
            btnOk.removeEventListener("click", onOk);
            btnCancel.removeEventListener("click", onCancel);
            modal.classList.add("hidden");
        };
        
        const onOk = () => { cleanup(); resolve(true); };
        const onCancel = () => { cleanup(); resolve(false); };
        
        btnOk.addEventListener("click", onOk);
        btnCancel.addEventListener("click", onCancel);
    });
}

function showPrompt(title, message, defaultValue = "") {
    return new Promise((resolve) => {
        const modal = document.getElementById("promptModal");
        const input = document.getElementById("promptInput");
        
        document.getElementById("promptTitle").textContent = title;
        document.getElementById("promptMessage").textContent = message;
        input.value = defaultValue;
        modal.classList.remove("hidden");
        setTimeout(() => input.focus(), 100);

        const btnOk = document.getElementById("promptOkBtn");
        const btnCancel = document.getElementById("promptCancelBtn");
        
        const cleanup = () => {
            btnOk.removeEventListener("click", onOk);
            btnCancel.removeEventListener("click", onCancel);
            modal.classList.add("hidden");
        };
        
        const onOk = () => { cleanup(); resolve(input.value); };
        const onCancel = () => { cleanup(); resolve(null); };
        
        btnOk.addEventListener("click", onOk);
        btnCancel.addEventListener("click", onCancel);
    });
}

// 5. Ações
window.addDays = async (uid, days) => {
    const confirmed = await showConfirm("Prorrogar Vencimento", `Adicionar ${days} dias para este cliente?`);
    if (!confirmed) return;
    try {
        const profileRef = doc(db, `tenants/${uid}/settings/profile`);
        // Precisamos buscar a data atual do banco ou usar Date.now() se vencido
        const tenant = allTenantsData.find(t => t.uid === uid);
        let baseDate = new Date();
        if (tenant && tenant.validUntil) {
            const currentValid = new Date(tenant.validUntil);
            if (currentValid > baseDate) {
                baseDate = currentValid;
            }
        }
        
        baseDate.setDate(baseDate.getDate() + days);
        await updateDoc(profileRef, { validUntil: baseDate.toISOString() });
        loadTenants();
    } catch (e) {
        alert("Erro: " + e.message);
    }
};

window.blockTenant = async (uid) => {
    const confirmed = await showConfirm("Bloquear Cliente", "Tem certeza que deseja bloquear o acesso agora?");
    if (!confirmed) return;
    try {
        const profileRef = doc(db, `tenants/${uid}/settings/profile`);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        await updateDoc(profileRef, { validUntil: yesterday.toISOString() });
        loadTenants();
    } catch (e) {
        alert("Erro: " + e.message);
    }
};

window.registerPayment = async (uid, currentValidStr) => {
    const valor = await showPrompt("Registrar Pagamento", "Qual o valor pago? (Ex: 79.90)", "79.90");
    if (!valor) return;
    
    const parsedValor = parseFloat(valor.replace(',', '.'));
    if (isNaN(parsedValor)) {
        alert("Valor inválido.");
        return;
    }

    const confirmed = await showConfirm("Confirmar Pagamento", `Registrar pagamento de R$ ${parsedValor.toFixed(2)} e renovar +30 dias?`);
    if (!confirmed) return;
    
    try {
        const profileRef = doc(db, `tenants/${uid}/settings/profile`);
        
        let baseDate = new Date();
        if (currentValidStr) {
            const currentValid = new Date(currentValidStr);
            if (currentValid > baseDate) {
                baseDate = currentValid;
            }
        }
        
        baseDate.setDate(baseDate.getDate() + 30);
        
        const paymentRecord = {
            date: new Date().toISOString(),
            value: parsedValor,
            type: "Mensalidade"
        };

        await updateDoc(profileRef, { 
            validUntil: baseDate.toISOString(),
            paymentHistory: arrayUnion(paymentRecord)
        });
        
        loadTenants();
    } catch (e) {
        alert("Erro: " + e.message);
    }
};
