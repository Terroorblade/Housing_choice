const criteria = [
    "Цена за м²",
    "Площадь",
    "Тип жилья",
    "Расстояние до детского сада",
    "Расстояние до школы",
    "Детская поликлиника",
    "Взрослая поликлиника",
    "Кружки и секции",
    "Экология",
    "Транспорт"
];

const formDiv = document.getElementById("form");
const resultDiv = document.getElementById("result");

let answers = JSON.parse(localStorage.getItem("ftopsis_answers") || "{}");

// множественный выбор районов

let selectedDistricts = [];

const districtSelect = document.getElementById("districtSelect");
const selectedDistrictsDiv = document.getElementById("selectedDistricts");

// выбор района
districtSelect.addEventListener("change", () => {

    const value = districtSelect.value;

    if (!value) return;

    // не добавлять повторно
    if (selectedDistricts.includes(value)) {
        districtSelect.value = "";
        return;
    }

    selectedDistricts.push(value);

    renderDistricts();

    districtSelect.value = "";
});

// отображение выбранных районов
function renderDistricts() {

    selectedDistrictsDiv.innerHTML = "";

    selectedDistricts.forEach(district => {

        const tag = document.createElement("div");

        tag.className = "district-tag";

        tag.innerHTML = `
            ${district}
            <span class="remove-district">✕</span>
        `;

        tag.querySelector(".remove-district").onclick = () => {

            selectedDistricts =
                selectedDistricts.filter(d => d !== district);

            renderDistricts();
        };

        selectedDistrictsDiv.appendChild(tag);
    });
}


// ===== Функция получения фильтров =====
function getFilters() {
    return {
        max_price: document.getElementById("maxPrice").value
            ? Number(document.getElementById("maxPrice").value)
            : null,
        min_area: document.getElementById("minArea").value
            ? Number(document.getElementById("minArea").value)
            : null,
        rooms: document.getElementById("rooms").value
            ? Number(document.getElementById("rooms").value)
            : null,
        housing_type: document.getElementById("housingType").value !== ""
            ? Number(document.getElementById("housingType").value)
            : null,
        // district: document.getElementById("district").value || null,
        districts: selectedDistricts,
        has_elevator: document.getElementById("hasElevator").value === ""
            ? null
            : document.getElementById("hasElevator").value === "true",
        floor_type: document.getElementById("floorType").value || null,
    };
}

// ===== Генерация UI для критериев =====
criteria.forEach((c, i) => {
    const card = document.createElement("div");
    card.className = "pair";
    card.innerHTML = `<div class="pair-title">${c}</div>`;

    const scale = document.createElement("div");
    scale.className = "scale ftopsis"; // 10 кнопок вместо 9

    for (let k = 1; k <= 10; k++) {
        const btn = document.createElement("button");
        btn.innerText = k;
        if (answers[i] == k) btn.classList.add("selected");

        btn.onclick = () => {
            answers[i] = k;
            localStorage.setItem("ftopsis_answers", JSON.stringify(answers));
            [...scale.children].forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
        };
        scale.appendChild(btn);
    }

    card.appendChild(scale);
    formDiv.appendChild(card);
});

// ===== Отправка данных =====
async function submitFTOPSIS() {
    const weights = criteria.map((_, i) => answers[i]);

    if (weights.includes(undefined)) {
        alert("Заполните все критерии");
        return;
    }

    const filters = getFilters();
    const res = await fetch("/ftopsis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weights, filters })
    });

    const data = await res.json();
    localStorage.setItem("ftopsis_result", JSON.stringify(data));
    showResult(data);
}

// ===== Отображение результатов (КАК В AHP) =====
function showResult(data) {
    formDiv.style.display = "none";
    document.querySelector(".instructions").style.display = "none";
    document.getElementById("submitBtn").style.display = "none";
    document.querySelector(".filter-section").style.display = "none";

    resultDiv.style.display = "block";
    resultDiv.innerHTML = "<h2>Рейтинг квартир</h2>";

    // === Если нет подходящих квартир (как в AHP) ===
    if (!data.ranking || data.ranking.length === 0) {
        resultDiv.innerHTML = `
            <h2>Результаты подбора</h2>
            <div class="card" style="text-align:center; border: 2px solid #ff6b6b; background: #fff5f5;">
                <h3 style="color: #c92a2a;">⚠️ Квартир с выбранными параметрами не найдено</h3>
                <p style="margin-top:10px;">
                    Попробуйте изменить фильтры или расширить диапазон поиска.
                </p>
            </div>
            <div class="instructions">
                <h3>Что можно сделать</h3>
                <ul>
                    <li>Увеличить диапазон цены</li>
                    <li>Уменьшить минимальную площадь</li>
                    <li>Убрать часть фильтров</li>
                </ul>
            </div>
            <div style="text-align:center; margin-top:20px;">
                <button onclick="edit()" id="editBtn">✏️ Изменить фильтр</button>
                <button onclick="restart()" id="restartBtn">🔄 Пройти заново</button>
            </div>
        `;
        return;
    }

    // === Вывод рейтинга квартир
    data.ranking.forEach((apt, index) => {
        const isTop = index === 0 ? "top1" : "";
        
        // Исправление: нормализуем процент к диапазону 0-100%
        // Если score < 1, умножаем на 100; если уже в процентах — оставляем как есть
        let scorePercent = apt.score * 100;
        // if (scorePercent < 1) {
        //     scorePercent = scorePercent * 100;
        // }
        
        
        resultDiv.innerHTML += `
            <div class="card ${isTop}">
                <h3>${index + 1} место — ${apt.name}</h3>
                <p><b>Адрес:</b> ${apt.address}</p>
                <p><b>Оценка:</b> ${scorePercent.toFixed(1)}%</p>
                <a href="${apt.url}" target="_blank">Открыть объявление</a>
            </div>
        `;
    });

    
    resultDiv.innerHTML += `
        <div style="text-align:center; margin-top:20px;">
            <button onclick="edit()" id="editBtn">✏️ Изменить ответы</button>
            <button onclick="restart()" id="restartBtn">🔄 Пройти заново</button>
            <button onclick="save()" id="saveSurvey">💾 Сохранить опрос</button>
        </div>
    `;
}

// ===== Управление =====
function edit() {
    resultDiv.style.display = "none";
    formDiv.style.display = "block";
    document.querySelector(".instructions").style.display = "block";
    document.getElementById("submitBtn").style.display = "block";
    document.querySelector(".filter-section").style.display = "block";
}

function restart() {
    localStorage.removeItem("ftopsis_answers");
    localStorage.removeItem("ftopsis_result");
    location.reload();
}

// ===== Сохранение опроса =====
async function save() {
    const res = await fetch("/save-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            method: "ftopsis",
            answers,
            filters: getFilters()
        })
    });
    alert("Сохранено");
}

// ===== Загрузка сохранённого опроса =====
async function loadSurvey(id) {
    const res = await fetch(`/survey/${id}`);
    const survey = await res.json();
    answers = survey.answers;
    localStorage.setItem("ftopsis_answers", JSON.stringify(answers));
    submitFTOPSIS();
}

// ===== Автозагрузка =====
window.onload = () => {
    const savedResult = localStorage.getItem("ftopsis_result");
    if (savedResult) {
        const data = JSON.parse(savedResult);
        if (data?.ranking?.length > 0) {
            showResult(data);
        }
    }
};

window.addEventListener("DOMContentLoaded", async () => {
    const id = new URLSearchParams(location.search).get("survey_id");
    if (id) await loadSurvey(id);
});

// ===== Глобальные функции для onclick =====
window.submitFTOPSIS = submitFTOPSIS;
window.edit = edit;
window.restart = restart;
window.save = save;

// ===== Модалка карты =====

const districtModal =
    document.getElementById("districtMapModal");

const showDistrictMapBtn =
    document.getElementById("showDistrictMapBtn");

showDistrictMapBtn.addEventListener("click", () => {

    districtModal.classList.add("active");
});

function closeDistrictMap() {

    districtModal.classList.remove("active");
}

// закрытие по клику вне окна
districtModal.addEventListener("click", (e) => {

    if (e.target === districtModal) {
        closeDistrictMap();
    }
});

window.closeDistrictMap = closeDistrictMap;