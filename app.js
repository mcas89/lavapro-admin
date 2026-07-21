import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collectionGroup, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
    tenantsList.innerHTML = `<li class="p-8 text-center text-blue-500 font-medium">Buscando clientes...</li>`;
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
                
                if (data.validUntil) {
                    const validDate = new Date(data.validUntil);
                    const now = new Date();
                    isValid = validDate > now;
                    const dateStr = validDate.toLocaleDateString('pt-BR');
                    
                    if (isValid) {
                        statusText = `Ativo até ${dateStr}`;
                        statusClass = 'text-green-600 bg-green-50';
                    } else {
                        statusText = `Vencido (${dateStr})`;
                        statusClass = 'text-red-600 bg-red-50';
                    }
                } else {
                    statusText = `Vitalício`;
                    statusClass = 'text-blue-600 bg-blue-50';
                    isValid = true;
                }

                allTenantsData.push({
                    uid,
                    companyName: data.company?.name || "Sem Nome",
                    ownerName: data.company?.owner || "—",
                    email: data.company?.email || "Email não preenchido",
                    phone: data.company?.phone || "",
                    isValid,
                    statusText,
                    statusClass
                });
            }
        });

        // Ordena por ativos primeiro, depois alfabético
        allTenantsData.sort((a, b) => {
            if (a.isValid === b.isValid) return a.companyName.localeCompare(b.companyName);
            return a.isValid ? -1 : 1;
        });

        renderTenants(allTenantsData);
        
    } catch (error) {
        tenantsList.innerHTML = `<li class="p-4 text-center text-red-500">Erro: ${error.message}</li>`;
    }
}

function renderTenants(dataArray) {
    tenantCount.textContent = `${dataArray.length} Clientes`;
    
    if (dataArray.length === 0) {
        tenantsList.innerHTML = `<li class="p-8 text-center text-gray-400">Nenhum resultado.</li>`;
        return;
    }

    let html = '';
    dataArray.forEach(t => {
        html += `
            <li class="p-4 hover:bg-gray-50 transition">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="font-bold text-gray-900 text-lg">${t.companyName}</h3>
                        <p class="text-sm text-gray-500">${t.ownerName} &bull; ${t.email}</p>
                    </div>
                    <span class="inline-flex px-2 py-1 rounded text-xs font-bold ${t.statusClass}">
                        ${t.statusText}
                    </span>
                </div>
                
                <div class="flex gap-2 mt-3">
                    <button onclick="addDays('${t.uid}', 7)" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold py-2 rounded border border-gray-200 transition">
                        +7 Dias
                    </button>
                    <button onclick="addDays('${t.uid}', 30)" class="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold py-2 rounded border border-blue-200 transition">
                        +1 Mês
                    </button>
                    <button onclick="blockTenant('${t.uid}')" class="flex-1 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold py-2 rounded border border-red-200 transition">
                        Bloquear
                    </button>
                </div>
                ${t.phone ? `
                <button onclick="window.open('https://wa.me/55${t.phone.replace(/\\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(t.ownerName)}%2C%20aqui%20%C3%A9%20do%20suporte%20LavaPro.', '_blank')" class="w-full mt-2 bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-semibold py-2 rounded transition flex items-center justify-center gap-2">
                    Falar no WhatsApp (${t.phone})
                </button>
                ` : `
                <button disabled class="w-full mt-2 bg-gray-100 text-gray-400 text-sm font-semibold py-2 rounded cursor-not-allowed">
                    Telefone não cadastrado
                </button>
                `}
            </li>
        `;
    });
    
    tenantsList.innerHTML = html;
}

// 5. Ações
window.addDays = async (uid, days) => {
    if (!confirm(`Adicionar ${days} dias?`)) return;
    try {
        const profileRef = doc(db, `tenants/${uid}/settings/profile`);
        const dateToAdd = new Date();
        dateToAdd.setDate(dateToAdd.getDate() + days);
        await updateDoc(profileRef, { validUntil: dateToAdd.toISOString() });
        loadTenants();
    } catch (e) {
        alert("Erro: " + e.message);
    }
};

window.blockTenant = async (uid) => {
    if (!confirm("Bloquear agora?")) return;
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
