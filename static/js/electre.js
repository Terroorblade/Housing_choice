const criteria = [
    "Низкая цена за м²",           // cost — меньше = лучше
    "Большая площадь",             // benefit — больше = лучше
    "Новостройка",                  // benefit — 1 лучше 0
    "Близость к детскому саду",    // cost — меньше расстояние = лучше
    "Близость к школе",            // cost
    "Близость к детской поликлинике", // cost
    "Близость к взрослой поликлинике", // cost
    "Кружки и секции в районе",   // benefit — больше = лучше
    "Экология района",             // benefit
    "Транспортная доступность"     // benefit
];

const formDiv = document.getElementById("form");
const resultDiv = document.getElementById("result");

let answers = JSON.parse(
    localStorage.getItem("electre_answers") || "{}"
);


// выбор нескольких районов

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


// фильтры

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

let currentPage = 1;
const itemsPerPage = 8;
let currentKernel = [];

function changePage(page) {

    const totalPages =
        Math.ceil(currentKernel.length / itemsPerPage);

    if (page < 1 || page > totalPages) return;

    currentPage = page;

    renderPage();
}

window.changePage = changePage;

function renderPage() {

    const cardsContainer =
        document.getElementById("rankingCards");

    if (!cardsContainer) return;

    const start =
        (currentPage - 1) * itemsPerPage;

    const end =
        start + itemsPerPage;

    const pageItems =
        currentKernel.slice(start, end);

    cardsContainer.innerHTML = "";

    pageItems.forEach((apt, localIndex) => {

        const globalIndex =
            start + localIndex;

        cardsContainer.innerHTML += `
            <div class="card ${globalIndex === 0 ? "top1" : ""}">

                <h3>
                    
                    ${apt.name}
                </h3>

                <p>
                    <b>Адрес:</b>
                    ${apt.address}
                </p>

                <a href="${apt.url}" target="_blank">
                    Открыть объявление
                </a>

            </div>
        `;
    });

    renderPagination();
}

function renderPagination() {

    const pagination =
        document.getElementById("pagination");

    if (!pagination) return;

    const totalPages =
        Math.ceil(currentKernel.length / itemsPerPage);

    let html = `
        <button class="page-btn"
                onclick="changePage(${currentPage - 1})"
                ${currentPage === 1 ? "disabled" : ""}>
            ←
        </button>
    `;

    for (let i = 1; i <= totalPages; i++) {

        html += `
            <button
                class="page-btn ${i === currentPage ? "active" : ""}"
                onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }

    html += `
        <button class="page-btn"
                onclick="changePage(${currentPage + 1})"
                ${currentPage === totalPages ? "disabled" : ""}>
            →
        </button>
    `;

    pagination.innerHTML = html;
}


function showResult(data) {

    formDiv.style.display = "none";
    document.querySelector(".instructions").style.display = "none";
    document.getElementById("submitBtn").style.display = "none";
    document.querySelector(".filter-section").style.display = "none";
    resultDiv.style.display = "block";

    resultDiv.innerHTML =
        "<h2>Ядро ELECTRE (лучшие альтернативы)</h2>";

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

    // // ===== вывод квартир =====
    // data.kernel.forEach((apt, index) => {

    //     resultDiv.innerHTML += `
    //         <div class="card ${index === 0 ? "top1" : ""}">
    //             <h3>
    //                 ${apt.name}
    //             </h3>
    //             <p>
    //                 <b>Адрес:</b> ${apt.address}
    //             </p>
    //             <a href="${apt.url}" target="_blank">
    //                 Открыть объявление
    //             </a>

    //         </div>
    //     `;
    // });

    currentKernel = data.kernel;
    currentPage = 1;

    resultDiv.innerHTML += `
        <div id="rankingCards"></div>

        <div id="pagination"
            class="pagination">
        </div>
    `;

    renderPage();

    // кнопки

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


window.submitElectre = submitElectre;
window.edit = edit;
window.restart = restart;
window.save = save;

//модалка карты
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