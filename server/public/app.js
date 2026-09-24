console.log('auth ===', auth);
import { auth, db } from './firebase.js';

import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import { 
    doc, 
    setDoc, 
    getDoc, 
    onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let currentDate = new Date();
let selectedDay = null;
let unsubscribeSnapshot = null;

let data = {
    monthlyHours: 160,
    includeSaturday: false,
    hours: {},
    daysOff: {}
};
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userEmail = document.getElementById('userEmail');
const addTodayBtn = document.getElementById('addTodayBtn');

const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const saturdayToggle = document.getElementById('saturdayToggle');
const monthlyHoursInput = document.getElementById('monthlyHours');
const modal = document.getElementById('modal');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');

const editLoginBtn = document.getElementById('editLoginBtn');
const loginModal = document.getElementById('loginModal');
const login42Input = document.getElementById('login42Input');
const cancelLoginBtn = document.getElementById('cancelLoginBtn');
const saveLoginBtn = document.getElementById('saveLoginBtn');
const displayLogin42 = document.getElementById('displayLogin42');

let userLogin42 = '';

loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
});

registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
});

registerBtn.addEventListener('click', async () => {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorEl = document.getElementById('registerError');
    
    errorEl.textContent = '';
    
    if (!email || !password) {
        errorEl.textContent = 'Veuillez remplir tous les champs';
        return;
    }
    
    if (password.length < 6) {
        errorEl.textContent = 'Le mot de passe doit contenir au moins 6 caractères';
        return;
    }
    
    try {
        await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error('Erreur inscription:', error);
        if (error.code === 'auth/email-already-in-use') {
            errorEl.textContent = 'Cet email est déjà utilisé';
        } else if (error.code === 'auth/invalid-email') {
            errorEl.textContent = 'Email invalide';
        } else {
            errorEl.textContent = 'Erreur lors de l\'inscription';
        }
    }
    const login42Field = document.getElementById('registerLogin42').value.trim();
    if (login42Field) {
        setTimeout(async () => {
            await saveLogin42ToFirebase(login42Field);
            userLogin42 = login42Field;
            displayLogin42.textContent = login42Field;
        }, 1000);
    }
});

loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    errorEl.textContent = '';
    
    if (!email || !password) {
        errorEl.textContent = 'Veuillez remplir tous les champs';
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error('Erreur connexion:', error);
        if (error.code === 'auth/invalid-credential') {
            errorEl.textContent = 'Email ou mot de passe incorrect';
        } else if (error.code === 'auth/user-not-found') {
            errorEl.textContent = 'Utilisateur introuvable';
        } else {
            errorEl.textContent = 'Erreur lors de la connexion';
        }
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
            unsubscribeSnapshot = null;
        }
        
        await signOut(auth);
    } catch (error) {
        console.error('Erreur déconnexion:', error);
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        console.log('Utilisateur connecté:', user.email);
        
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        userEmail.textContent = user.email;
        
        loadDataFromFirebase();
        loadLogin42FromFirebase();
        
    } else {
        currentUser = null;
        console.log('Utilisateur déconnecté');
        
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        
        data = {
            monthlyHours: 160,
            includeSaturday: false,
            hours: {},
            daysOff: {}
        };
    }
});

function getCurrentYearMonth() {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

async function loadDataFromFirebase() {
    if (!currentUser) return;
    
    const yearMonth = getCurrentYearMonth();
    const docRef = doc(db, 'users', currentUser.uid, 'timeData', yearMonth);
    
    try {
        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
        }
        
        unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                console.log('Données reçues depuis Firebase:', cloudData);
                
                data.monthlyHours = cloudData.monthlyHours || 160;
                data.includeSaturday = cloudData.includeSaturday || false;
                data.hours = cloudData.hours || {};
                data.daysOff = cloudData.daysOff || {};
                
                updateUIWithData();
            } else {
                console.log('Pas de données pour ce mois, utilisation des valeurs par défaut');
                saveDataToFirebase();
            }
        }, (error) => {
            console.error('Erreur lors de l\'écoute:', error);
        });
        
    } catch (error) {
        console.error('Erreur chargement Firebase:', error);
    }
}

async function saveDataToFirebase() {
    if (!currentUser) return;
    
    const yearMonth = getCurrentYearMonth();
    const docRef = doc(db, 'users', currentUser.uid, 'timeData', yearMonth);
    
    try {
        await setDoc(docRef, {
            monthlyHours: data.monthlyHours,
            includeSaturday: data.includeSaturday,
            hours: data.hours,
            daysOff: data.daysOff,
            lastUpdated: new Date()
        });
        
        console.log('Données sauvegardées dans Firebase !');
    } catch (error) {
        console.error('Erreur sauvegarde Firebase:', error);
    }
}

function updateUIWithData() {
    monthlyHoursInput.value = data.monthlyHours;
    
    if (data.includeSaturday) {
        saturdayToggle.classList.add('active');
    } else {
        saturdayToggle.classList.remove('active');
    }
    
    renderCalendar();
    updateStats();
}

editLoginBtn.addEventListener('click', () => {
    login42Input.value = userLogin42 || '';
    loginModal.classList.add('active');
    login42Input.focus();
});

cancelLoginBtn.addEventListener('click', () => {
    loginModal.classList.remove('active');
});

loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        loginModal.classList.remove('active');
    }
});

saveLoginBtn.addEventListener('click', async () => {
    const newLogin = login42Input.value.trim();
    
    if (newLogin) {
        userLogin42 = newLogin;
        displayLogin42.textContent = newLogin;
        await saveLogin42ToFirebase(newLogin);
    }
    
    loginModal.classList.remove('active');
});

async function saveLogin42ToFirebase(login) {
    if (!currentUser) return;
    
    const userDocRef = doc(db, 'users', currentUser.uid);
    
    try {
        await setDoc(userDocRef, {
            login42: login,
            email: currentUser.email,
            lastUpdated: new Date()
        }, { merge: true });
        
        console.log('Login 42 sauvegardé:', login);
    } catch (error) {
        console.error('Erreur sauvegarde login:', error);
    }
}

async function loadLogin42FromFirebase() {
    if (!currentUser) return;
    
    const userDocRef = doc(db, 'users', currentUser.uid);
    
    try {
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists() && docSnap.data().login42) {
            userLogin42 = docSnap.data().login42;
            displayLogin42.textContent = userLogin42;
        } else {
            displayLogin42.textContent = '---';
        }
    } catch (error) {
        console.error('Erreur chargement login:', error);
    }
}

const syncBtn = document.getElementById('syncBtn');

    function parseLogtime(timeString) {
        const parts = timeString.split(':');
        let hours = parseInt(parts[0], 10);
        let minutes = parseInt(parts[1], 10);
        const seconds = parseFloat(parts[2]) || 0;
        if (seconds >= 30) {
            minutes++;
            if (minutes >= 60) {
                hours++;
                minutes = 0;
            }
        }
        return parseFloat(`${hours}.${String(minutes).padStart(2, '0')}`);
    }

async function syncWith42() {
    if (!userLogin42 || userLogin42 === '---') {
        alert('Veuillez d\'abord configurer votre login 42 !');
        return;
    }

    syncBtn.disabled = true;
    syncBtn.textContent = '⏳ Sync...';

    try {
        const response = await fetch(`/api/logtime/${encodeURIComponent(userLogin42)}`);
        
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des données');
        }

        const logtimeData = await response.json();
        
        console.log('📥 Données reçues de l\'API:', logtimeData);
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        let syncedCount = 0;

        for (const dateKey of Object.keys(data.hours)) {
            const [y, m] = dateKey.split('-').map(Number);
            if (y === year && m === month + 1) {
                delete data.hours[dateKey];
            }
        }

        console.log(`📅 Mois actuel: ${year}-${month + 1}`);

        for (const [dateStr, timeStr] of Object.entries(logtimeData)) {
            const dateParts = dateStr.split('-');
            const dateYear = parseInt(dateParts[0], 10);
            const dateMonth = parseInt(dateParts[1], 10) - 1;
            
            console.log(`Checking: ${dateStr} → year=${dateYear}, month=${dateMonth + 1}`);
            
            if (dateYear === year && dateMonth === month) {
                const hours = parseLogtime(timeStr);
                const preciseHours = Math.round(hours * 100) / 100;
                
                console.log(`✅ Match! ${dateStr}: ${timeStr} → ${preciseHours}h`);
                
                if (preciseHours > 0) {
                    data.hours[dateStr] = preciseHours;
                    syncedCount++;
                }
            }
        }
         console.log('📊 data.hours après sync:', data.hours);

        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
            unsubscribeSnapshot = null;
        }

        await saveDataToFirebase();
        
        renderCalendar();
        updateStats();

        alert(`✅ Synchronisation réussie !\n${syncedCount} jour(s) mis à jour pour ${getMonthName(currentDate)}`);
            const yearMonth = getCurrentYearMonth();
            const docRef = doc(db, 'users', currentUser.uid, 'timeData', yearMonth);
            unsubscribeSnapshot = onSnapshot(docRef, () => {
            });

    } catch (error) {
        console.error('Erreur sync 42:', error);
        alert('❌ Erreur lors de la synchronisation. Vérifiez que le serveur est lancé.');
    } finally {
        syncBtn.disabled = false;
        syncBtn.textContent = '🔄 Sync 42';
    }
}

syncBtn.addEventListener('click', syncWith42);

function saveSettings() {
    data.monthlyHours = parseInt(monthlyHoursInput.value) || 160;
    saveDataToFirebase();
    updateStats();
}

function toggleSaturday() {
    saturdayToggle.classList.toggle('active');
    data.includeSaturday = saturdayToggle.classList.contains('active');
    saveDataToFirebase();
    renderCalendar();
    updateStats();
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    
    if (currentUser) {
        loadDataFromFirebase();
    } else {
        renderCalendar();
        updateStats();
    }
}

function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date) {
    let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
}

function formatDate(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getMonthName(date) {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function isToday(year, month, day) {
    const today = new Date();
    return today.getFullYear() === year && 
           today.getMonth() === month && 
           today.getDate() === day;
}

function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const monthName = document.getElementById('currentMonth');
    
    monthName.textContent = getMonthName(currentDate);
    calendar.innerHTML = '';

    const calendarWrapper = document.querySelector('.calendar');
    if (calendarWrapper) {
        calendarWrapper.classList.toggle('include-saturday', !data.includeSaturday);
}

    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    dayNames.forEach((name, idx) => {
        const header = document.createElement('div');
        header.className = 'day-header';
        if (idx === 5) header.classList.add('saturday-header');
        if (idx === 6) header.classList.add('sunday-header');
        header.textContent = name;
        calendar.appendChild(header);
    });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell empty';
        calendar.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = formatDate(year, month, day);
        const cell = document.createElement('div');
        cell.className = 'day-cell';

        const _dateObj = new Date(year, month, day);
        if (_dateObj.getDay() === 6) cell.classList.add('saturday');
        if (_dateObj.getDay() === 0) cell.classList.add('sunday');
        
        if (isToday(year, month, day)) {
            cell.classList.add('today');
        }

        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        cell.appendChild(dayNumber);

        if (data.daysOff && data.daysOff[dateKey]) {
            cell.classList.add('day-off');
            const offLabel = document.createElement('div');
            offLabel.className = 'day-off-indicator';
            offLabel.textContent = 'off';
            cell.appendChild(offLabel);
        }

        if (data.hours[dateKey]) {
            cell.classList.add('has-hours');
            const hours = document.createElement('div');
            hours.className = 'day-hours';
            hours.textContent = `${data.hours[dateKey]}h`;
            cell.appendChild(hours);
        }

        cell.onclick = () => openModal(year, month, day);
        calendar.appendChild(cell);
    }
}

function getWorkingDays() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        
        if ((dayOfWeek === 0 || dayOfWeek === 6) && !data.includeSaturday ) continue;
        if (data.daysOff && data.daysOff[formatDate(year, month, day)]) continue;
        
        workingDays++;
    }

    return workingDays;
}

function getRemainingWorkingDays() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    const today = new Date();
    let remainingDays = 0;

    if (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())) {
        return getWorkingDays();
    }

    if (year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth())) {
        return 0;
    }

    const startDay = today.getDate();
    
    for (let day = startDay; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        
        if ((dayOfWeek === 0 || dayOfWeek === 6) && !data.includeSaturday) continue;
        if (data.daysOff && data.daysOff[formatDate(year, month, day)]) continue;
        
        remainingDays++;
    }

    return remainingDays;
}

function parseHours(input) {
    if (input === null || input === undefined) return 0;
    const raw = String(input).trim();
    if (raw === '') return 0;

    const match = raw.match(/^(\d+)\s*[:hH.,]\s*(\d{1,2})$/);
    if (match) {
        const h = parseInt(match[1], 10);
        let m = parseInt(match[2], 10);

        if (match[2].length === 1) {
            m = m * 10;
        }
        return h * 60 + m;
    }

    const asInt = parseInt(raw, 10);
    if (!isNaN(asInt) && String(asInt) === raw) {
        return asInt * 60;
    }

    const asFloat = parseFloat(raw.replace(',', '.'));
    if (!isNaN(asFloat)) {
        return Math.round(asFloat * 60);
    }

    return 0;
}

function formatHours(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}.${String(m).padStart(2, '0')}`;
}
function updateStats() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);

    let totalMinutes = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = formatDate(year, month, day);
        const hoursValue = data.hours[dateKey];
        if (hoursValue !== undefined) {
            totalMinutes += parseHours(hoursValue);
        }
    }

    const now = new Date();
    const monthlyMinutes = parseHours(data.monthlyHours);
    const todayKey = formatDate(year, month, now.getDate());
    const remainingMinutes = Math.max(0, monthlyMinutes - totalMinutes);
    const todayMinutes = parseHours(data.hours[todayKey] || 0);
    const totalMionutesWithoutToday = totalMinutes - todayMinutes;
    const remainingDays = getRemainingWorkingDays();
    const remainingForAverage = Math.max(0, monthlyMinutes - totalMionutesWithoutToday);
    const baseAverage = remainingDays > 0 ? Math.floor(remainingForAverage / remainingDays) : 0;
    const todayOverage = Math.max(0, todayMinutes - baseAverage);
    const adjustRemaining = Math.max(0, remainingForAverage - todayOverage);
    const average = remainingDays > 0 ? Math.floor(adjustRemaining / remainingDays) : 0;

    document.getElementById('hoursDone').textContent = formatHours(totalMinutes);
    document.getElementById('hoursRemaining').textContent = formatHours(remainingMinutes);
    document.getElementById('hoursRequired').textContent = formatHours(monthlyMinutes);
    document.getElementById('dailyAverage').textContent = formatHours(average);

    const todayEl = document.getElementById('todayTarget');
    const isCurrentMonth = (year === now.getFullYear() && month === now.getMonth());

    if (isCurrentMonth)
    {
        const todayReamainingMinutes = average - todayMinutes;

        if (todayReamainingMinutes <= 0)
        {
            todayEl.textContent = '✓ Objectif atteint';
            todayEl.classList.add('goal-reached');
            todayEl.classList.remove('goal-pending');
        }
        else
        {
            todayEl.textContent = `Il reste ${formatHours(todayReamainingMinutes)} aujourd\'hui`;
            todayEl.classList.add('goal-pending');
            todayEl.classList.remove('goal-reached');
        }
        todayEl.style.display = '';
    }
    else
    {
        todayEl.style.display = 'none';
    }
}

function openModal(year, month, day) {
    selectedDay = { year, month, day };
    const dateKey = formatDate(year, month, day);
    const date = new Date(year, month, day);
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    
    document.getElementById('modalDate').textContent = 
        `${dayNames[date.getDay()]} ${day} ${getMonthName(currentDate).split(' ')[0]}`;
    document.getElementById('hoursInput').value = data.hours[dateKey] || '';
    
    const dayOffToggle = document.getElementById('dayOffToggle');
    if (data.daysOff && data.daysOff[dateKey])
        dayOffToggle.classList.add('active');
    else
        dayOffToggle.classList.remove('active');

    if (data.hours[dateKey]) {
        deleteBtn.classList.remove('hidden');
    } else {
        deleteBtn.classList.add('hidden');
    }
    
    modal.classList.add('active');
    document.getElementById('hoursInput').focus();
}

function closeModal() {
    modal.classList.remove('active');
    selectedDay = null;
}

function saveHours() {
    if (!selectedDay) return;
    
    const hours = parseFloat(document.getElementById('hoursInput').value);
    const dateKey = formatDate(selectedDay.year, selectedDay.month, selectedDay.day);
    
    if (hours && hours > 0) {
        data.hours[dateKey] = hours;
    } else {
        delete data.hours[dateKey];
    }
    
    saveDataToFirebase();
    
    renderCalendar();
    updateStats();
    closeModal();
}

function deleteHours() {
    if (!selectedDay) return;
    
    const dateKey = formatDate(selectedDay.year, selectedDay.month, selectedDay.day);
    delete data.hours[dateKey];
    
    saveDataToFirebase();
    
    renderCalendar();
    updateStats();
    closeModal();
}

prevMonthBtn.addEventListener('click', () => changeMonth(-1));
nextMonthBtn.addEventListener('click', () => changeMonth(1));
saturdayToggle.addEventListener('click', toggleSaturday);
monthlyHoursInput.addEventListener('change', saveSettings);
cancelBtn.addEventListener('click', closeModal);
saveBtn.addEventListener('click', saveHours);
deleteBtn.addEventListener('click', deleteHours);

document.getElementById('dayOffToggle').addEventListener('click', () =>
{
    if (!selectedDay) return;
    const dateKey = formatDate(selectedDay.year, selectedDay.month, selectedDay.day);
    const toggle = document.getElementById('dayOffToggle');
    if (data.daysOff[dateKey])
    {
        delete data.daysOff[dateKey];
        toggle.classList.remove('active');
    }
    else
    {
        data.daysOff[dateKey] = true;
        toggle.classList.add('active');
    }
    
    saveDataToFirebase();
    renderCalendar();
    updateStats();
});

addTodayBtn.addEventListener('click', () =>
{
    const now = new Date();
    openModal(now.getFullYear(), now.getMonth(), now.getDate());
});

document.getElementById('hoursInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        saveHours();
    }
});

modal.addEventListener('click', (e) => {
    if (e.target.id === 'modal') {
        closeModal();
    }
});

document.getElementById('loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

document.getElementById('registerPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') registerBtn.click();
});

document.getElementById('minusHours').addEventListener('click', () => {
    const input = document.getElementById('monthlyHours');
    const newValue = Math.max(0, parseInt(input.value) - 1);
    input.value = newValue;
    saveSettings();
});

document.getElementById('plusHours').addEventListener('click', () => {
    const input = document.getElementById('monthlyHours');
    input.value = parseInt(input.value) + 1;
    saveSettings();
});

console.log('App initialisée !');