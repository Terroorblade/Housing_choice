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

let answers = JSON.parse(
    localStorage.getItem("electre_answers") || "{}"
);


// ===== множественный выбор районов =====

let selectedDistricts = [];

const districtSelect =
    document.getElementById("districtSelect");

const selectedDistrictsDiv =
    document.getElementById("selectedDistricts");

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


// ===== Получение фильтров =====

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

        districts: selectedDistricts,

        has_elevator:
            document.getElementById("hasElevator").value === ""
                ? null
                : document.getElementById("hasElevator").value === "true",

        floor_type:
            document.getElementById("floorType").value || null
    };
}

// ===== UI =====

criteria.forEach((c, i) => {

    const card = document.createElement("div");

    card.className = "pair";

    card.innerHTML = `
        <div class="pair-title">${c}</div>
    `;

    const scale = document.createElement("div");

    scale.className = "scale ftopsis";

    for (let k = 1; k <= 10; k++) {

        const btn = document.createElement("button");

        btn.innerText = k;

        if (answers[i] == k) {
            btn.classList.add("selected");
        }

        btn.onclick = () => {

            answers[i] = k;

            localStorage.setItem(
                "electre_answers",
                JSON.stringify(answers)
            );

            [...scale.children].forEach(b =>
                b.classList.remove("selected")
            );

            btn.classList.add("selected");
        };

        scale.appendChild(btn);
    }

    card.appendChild(scale);

    formDiv.appendChild(card);
});

// ===== submit =====

async function submitElectre() {

    const weights = criteria.map((_, i) => answers[i]);

    if (weights.includes(undefined)) {
        alert("Заполните все критерии");
        return;
    }

    const filters = getFilters();

    const res = await fetch("/electre", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            weights,
            filters
        })
    });

    const data = await res.json();

    localStorage.setItem(
        "electre_result",
        JSON.stringify(data)
    );

    showResult(data);
}

// ===== result =====

function showResult(data) {

    formDiv.style.display = "none";

    document.querySelector(".instructions").style.display = "none";

    document.getElementById("submitBtn").style.display = "none";

    document.querySelector(".filter-section").style.display = "none";

    resultDiv.style.display = "block";

    resultDiv.innerHTML =
        "<h2>Ядро Парето (лучшие альтернативы)</h2>";

    // ===== если пусто =====

    if (
    (!data.kernel || data.kernel.length === 0) &&
    (!data.ranking || data.ranking.length === 0)
){

        resultDiv.innerHTML = `
            <h2>Результаты подбора</h2>

            <div class="card" style="text-align:center; border: 2px solid #ff6b6b; background: #fff5f5;">
            
                <h3 style="color:#c92a2a;">
                    ⚠️ Квартир с выбранными параметрами не найдено
                </h3>

                <p style="margin-top:10px;">
                    Попробуйте изменить фильтры
                    или расширить диапазон поиска.
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
                <button onclick="edit()" id="editBtn">
                    ✏️ Изменить фильтр
                </button>

                <button onclick="restart()" id="restartBtn">
                    🔄 Пройти заново
                </button>
            </div>
        `;

        return;
    }

    // ===== вывод квартир =====

    data.kernel.forEach((apt, index) => {

        resultDiv.innerHTML += `
            <div class="card ${index === 0 ? "top1" : ""}">

                <h3>
                    ${index + 1} место — ${apt.name}
                </h3>

                <p>
                    <b>Адрес:</b> ${apt.address}
                </p>

<p>
    <b>Оценка ELECTRE:</b> ${apt.score.toFixed(2)}
</p>

                <a href="${apt.url}" target="_blank">
                    Открыть объявление
                </a>

            </div>
        `;
    });

    // ===== кнопки =====

    resultDiv.innerHTML += `
        <div style="text-align:center; margin-top:20px;">

            <button onclick="edit()" id="editBtn">
                ✏️ Изменить ответы
            </button>

            <button onclick="restart()" id="restartBtn">
                🔄 Пройти заново
            </button>

            <button onclick="save()" id="saveSurvey">
                💾 Сохранить опрос
            </button>

        </div>
    `;
}

// ===== controls =====

function edit() {

    resultDiv.style.display = "none";

    formDiv.style.display = "block";

    document.querySelector(".instructions").style.display = "block";

    document.getElementById("submitBtn").style.display = "block";

    document.querySelector(".filter-section").style.display = "block";
}

function restart() {

    localStorage.removeItem("electre_answers");

    localStorage.removeItem("electre_result");

    location.reload();
}

// ===== save =====

async function save() {

    await fetch("/save-survey", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            method: "electre",
            answers,
            filters: getFilters()
        })
    });

    alert("Сохранено");
}

// ===== load =====

async function loadSurvey(id) {

    const res = await fetch(`/survey/${id}`);

    const survey = await res.json();

    answers = survey.answers;

    localStorage.setItem(
        "electre_answers",
        JSON.stringify(answers)
    );

    submitElectre();
}

// ===== auto load =====

window.onload = () => {

    const savedResult =
        localStorage.getItem("electre_result");

    if (savedResult) {

        const data = JSON.parse(savedResult);

        if (data?.kernel?.length > 0) {
            showResult(data);
        }
    }
};

window.addEventListener("DOMContentLoaded", async () => {

    const id =
        new URLSearchParams(location.search)
            .get("survey_id");

    if (id) {
        await loadSurvey(id);
    }
});

// ===== globals =====

window.submitElectre = submitElectre;
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