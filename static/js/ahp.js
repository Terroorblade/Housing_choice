
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


// const filters = {
//     max_price: document.getElementById("maxPrice").value ? Number(document.getElementById("maxPrice").value): null,
//     min_area: document.getElementById("minArea").value ? Number(document.getElementById("minArea").value): null,
//     rooms: document.getElementById("rooms").value || null,
//     housing_type: document.getElementById("housingType").value || null,
//     district: document.getElementById("district").value || null,
//     has_elevator: document.getElementById("hasElevator").value || null,
//     floor_type: document.getElementById("floorType").value || null,
// };


const formDiv = document.getElementById("form");
const resultDiv = document.getElementById("result");

//районы

let selectedDistricts = [];

const districtSelect = document.getElementById("districtSelect");
const selectedDistrictsContainer =
    document.getElementById("selectedDistricts");

districtSelect?.addEventListener("change", () => {

    const value = districtSelect.value;

    if (!value) return;

    if (!selectedDistricts.includes(value)) {
        selectedDistricts.push(value);
    }

    renderDistricts();

    districtSelect.value = "";
});

function renderDistricts() {

    selectedDistrictsContainer.innerHTML = "";

    selectedDistricts.forEach(district => {

        const tag = document.createElement("div");

        tag.className = "district-tag";

        tag.innerHTML = `
            <span>${district}</span>

            <button
                class="remove-district"
                onclick="removeDistrict('${district}')"
            >
                ✕
            </button>
        `;

        selectedDistrictsContainer.appendChild(tag);
    });
}

function removeDistrict(name) {

    selectedDistricts =
        selectedDistricts.filter(d => d !== name);

    renderDistricts();
}

// районы карта

const mapBtn =
    document.getElementById("showDistrictMapBtn");

mapBtn?.addEventListener("click", () => {

    document
        .getElementById("districtMapModal")
        .classList.add("active");
});

function closeDistrictMap() {

    document
        .getElementById("districtMapModal")
        .classList.remove("active");
}

window.closeDistrictMap = closeDistrictMap;
window.removeDistrict = removeDistrict;

// сравнение пар критериев
function generatePairs() {
  let pairs = [];

  for (let i = 0; i < criteria.length; i++) {
    for (let j = i + 1; j < criteria.length; j++) {
      pairs.push([i, j]);
    }
  }

  return pairs;
}

const pairs = generatePairs(criteria);

// загружаем сохранённые ответы
let answers = JSON.parse(localStorage.getItem("ahp_answers") || "{}");
//let answers = {};


pairs.forEach((pair, index) => {
    const [i, j] = pair;

    const container = document.createElement("div");
    container.className = "pair";

    const title = document.createElement("div");
title.className = "pair-title";
title.innerHTML = `
    Что важнее?<br>
    <b>${criteria[i]}</b> или <b>${criteria[j]}</b>
`;
    container.appendChild(title);

    const scale = document.createElement("div");
    scale.className = "scale";

    for (let k = 1; k <= 9; k++) {
        const btn = document.createElement("button");
        btn.innerText = k;

        // если уже выбран → подсветить
        if (answers[index] == k) {
            btn.classList.add("selected");
        }

        btn.onclick = () => {
            answers[index] = k;
            localStorage.setItem("ahp_answers", JSON.stringify(answers));

            // убрать выделение у других кнопок
            [...scale.children].forEach(b => b.classList.remove("selected"));

            btn.classList.add("selected");
        };

        scale.appendChild(btn);
    }

    container.appendChild(scale);
    formDiv.appendChild(container);
});


function buildMatrix() {
    const n = criteria.length;
    let matrix = Array.from({ length: n }, () => Array(n).fill(1));

    let pairIndex = 0;

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const value = answers[pairIndex];

            if (!value) {
                alert("Заполните все сравнения!");
                return null;
            }

            matrix[i][j] = value;
            matrix[j][i] = 1 / value;

            pairIndex++;
        }
    }

    return matrix;
}


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
        has_elevator: document.getElementById("hasElevator").value === ""
            ? null
            : document.getElementById("hasElevator").value === "true",
        floor_type: document.getElementById("floorType").value || null,
    };
}


async function submitData() {


    const matrix = buildMatrix();
    if (!matrix) return;

    const filters = getFilters();

    const response = await fetch("/ahp", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ matrix, filters })
    });

    const data = await response.json();

    // сохраняем результат
    localStorage.setItem("ahp_result", JSON.stringify(data));
    
    sessionStorage.setItem("ahp_result", JSON.stringify(data));


    showResult(data);
}

function normalizeWeights(weights) {
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => w / sum);
}

// function restartTest() {
//     localStorage.removeItem("ahp_answers");
//     sessionStorage.removeItem("ahp_result");
//     location.reload();
// }

function restartTest() {
    answers = {};
    formDiv.innerHTML = "";
    localStorage.removeItem("ahp_answers");
    localStorage.removeItem("ahp_result");
    sessionStorage.removeItem("ahp_result");
    location.reload();
}


function clarifyPreference(i, k, value) {
    // обновление соотв элемента матрицы парных сравнений
    const n = criteria.length;

    // определение индекса пары (i, k)
    let pairIndex = 0;
    for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) {
            if (a === i && b === k) {
                answers[pairIndex] = value;
                break;
            } else if (a === k && b === i) {
                answers[pairIndex] = 1 / value;
                break;
            }
            pairIndex++;
        }
    }

    // ответы
    localStorage.setItem("ahp_answers", JSON.stringify(answers));

    // повторный расчёт
    submitData();
}

function applyClarification(i, k, value) {
    const n = criteria.length;

    // Найти индекс пары (i, k)
    let pairIndex = 0;
    for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) {
            if (a === i && b === k) {
                answers[pairIndex] = value;
                break;
            }
            pairIndex++;
        }
    }

    // Сохранение и повторный расчёт
    localStorage.setItem("ahp_answers", JSON.stringify(answers));
    submitData();
}

//улучшение весов вариант 1 
// function showResult(data) {
//     formDiv.style.display = "none";
//     document.querySelector(".instructions").style.display = "none";
//     document.getElementById("submitBtn").style.display = "none";

//     resultDiv.style.display = "block";
//     resultDiv.innerHTML = "<h2>Рейтинг квартир</h2>";

//     // Вывод рейтинга
//     data.ranking.forEach((apt, index) => {
//         const isTop = index === 0 ? "top1" : "";
//         resultDiv.innerHTML += `
//             <div class="card ${isTop}">
//                 <h3>${index + 1} место — ${apt.name}</h3>
//                 <p><b>Адрес:</b> ${apt.address}</p>

//                 <p><b>Оценка:</b> ${(apt.score * 100).toFixed(1)}%</p>
//                 <a href="${apt.url}" target="_blank">Открыть объявление</a>
//             </div>
//         `;
//     });

//     // Кнопки редактирования
//     resultDiv.innerHTML += `
//         <div style="text-align:center; margin-top:20px;">
//             <button onclick="editAnswers()" id="editBtn">✏️ Изменить ответы</button>
//             <button onclick="restartTest()" id="restartBtn">🔄 Пройти заново</button>
//         </div>
//     `;

//     // Вывод весов критериев
//     const normalizedWeights = normalizeWeights(data.weights);
//     resultDiv.innerHTML += `
//         <div class="instructions">
//             <h2>Полученная важность критериев</h2>
//             <ul>
//                 ${normalizedWeights.map((w, i) =>
//                 `<li><b>${criteria[i]}:</b> ${(w * 100).toFixed(1)}%</li>`
//             ).join("")}
//             </ul>
//         </div>              
//     `;

//     // --- Уточняющий вопрос ---
//     if (data.CR >= 0.1 && data.clarification) {
//     resultDiv.innerHTML += `
//         <div class="instructions">
//             <h3>Уточнение предпочтений</h3>
//             <p>
//                 Ваши ответы содержат противоречия (CR = ${data.CR.toFixed(2)}).
//                 Уточните относительную важность критериев:
//             </p>
//             <p>
//                 <b>${data.clarification.criterion1}</b> по сравнению с 
//                 <b>${data.clarification.criterion2}</b>
//             </p>
//             <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
//                 ${[1,3,5,7,9].map(v => `
//                     <button onclick="applyClarification(${data.clarification.index_i}, ${data.clarification.index_k}, ${v})">
//                         ${v}
//                     </button>
//                 `).join("")}
//             </div>
//         </div>
//     `;
// }
// }

//соранение результатов опроса
async function saveSurvey() {

    const filters = getFilters();

    await fetch("/save-survey", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            method: "ahp",
            answers: answers,
            filters: filters
        })
    });

    alert("Опрос сохранён");
}


let currentPage = 1;
const itemsPerPage = 8;
let currentRanking = [];

function changePage(page) {

    const totalPages =
        Math.ceil(currentRanking.length / itemsPerPage);

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
        currentRanking.slice(start, end);

    cardsContainer.innerHTML = "";

    pageItems.forEach((apt, localIndex) => {

        const globalIndex =
            start + localIndex;

        const isTop =
            globalIndex === 0 ? "top1" : "";

        cardsContainer.innerHTML += `
            <div class="card ${isTop}">
                <h3>
                    ${globalIndex + 1} место —
                    ${apt.name}
                </h3>

                <p>
                    <b>Адрес:</b>
                    ${apt.address}
                </p>

                <p>
                    <b>Оценка:</b>
                    ${(apt.score * 100).toFixed(1)}%
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
        Math.ceil(currentRanking.length / itemsPerPage);

    let html = `
        <button
            class="page-btn"
            onclick="changePage(${currentPage - 1})"
            ${currentPage === 1 ? "disabled" : ""}
        >
            ←
        </button>
    `;

    for (let i = 1; i <= totalPages; i++) {

        html += `
            <button
                class="page-btn ${i === currentPage ? "active" : ""}"
                onclick="changePage(${i})"
            >
                ${i}
            </button>
        `;
    }

    html += `
        <button
            class="page-btn"
            onclick="changePage(${currentPage + 1})"
            ${currentPage === totalPages ? "disabled" : ""}
        >
            →
        </button>
    `;

    pagination.innerHTML = html;
}


//вывод результатов
//улучшение весов вариант 2

function showResult(data) {
    formDiv.style.display = "none";
    document.querySelector(".instructions").style.display = "none";
    document.getElementById("submitBtn").style.display = "none";

    document.querySelector(".filter-section").style.display = "none";

    resultDiv.style.display = "block";
    resultDiv.innerHTML = "<h2>Рейтинг квартир</h2>";


//если нет подходящих квартир
    if (!data.ranking || data.ranking.length === 0) {
        formDiv.style.display = "none";
        document.querySelector(".instructions").style.display = "none";
        document.getElementById("submitBtn").style.display = "none";
        document.querySelector(".filter-section").style.display = "none";

        resultDiv.style.display = "block";
        resultDiv.innerHTML = `
    <h2>Результаты подбора</h2>

    <div class="card" style="text-align:center; border: 2px solid #ff6b6b; background: #fff5f5;">
        <h3 style="color: #c92a2a;">⚠️ Квартир с выбранными параметрами не найдено</h3>
        <p style="margin-top:10px;">
            Попробуйте изменить фильтры или расширить диапазон поиска.
        </p>

        ${data.CR !== undefined ? `
            <div class="instructions" style="margin-top:15px;">
                <h3>Согласованность оценок</h3>
                <p style="text-align:center;">
                    <b>CR = ${data.CR.toFixed(3)}</b>
                </p>
            </div>
        ` : ""}
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
        <button id="editBtn" onclick="editAnswers()">✏️ Изменить фильтр</button>
        <button id="restartBtn" onclick="restartTest()">🔄 Пройти заново</button>
        <button id="saveSurvey" onclick="saveSurvey()"> 💾 Сохранить опрос </button>
        </div>
`;

        return;
    }
    currentRanking = data.ranking;
    currentPage = 1;

    // Вывод рейтинга квартир
    // data.ranking.forEach((apt, index) => {
    //     const isTop = index === 0 ? "top1" : "";
    //     resultDiv.innerHTML += `
    //         <div class="card ${isTop}">
    //             <h3>${index + 1} место — ${apt.name}</h3>
    //             <p><b>Адрес:</b> ${apt.address}</p>
    //             <p><b>Оценка:</b> ${(apt.score * 100).toFixed(1)}%</p>
    //             <a href="${apt.url}" target="_blank">Открыть объявление</a>
    //         </div>
    //     `;
    // });

    resultDiv.innerHTML += `
        <div id="rankingCards"></div>

        <div id="pagination"
            class="pagination">
        </div>
    `;

    renderPage();

    // Кнопки редактирования
    resultDiv.innerHTML += `
        <div style="text-align:center; margin-top:20px;">
            <button onclick="editAnswers()" id="editBtn">✏️ Изменить ответы</button>
            <button onclick="restartTest()" id="restartBtn">🔄 Пройти заново</button>
            <button id="saveSurvey" onclick="saveSurvey()"> 💾 Сохранить опрос </button>
        </div>
    `;

    // Вывод весов критериев
    const normalizedWeights = normalizeWeights(data.weights);
    resultDiv.innerHTML += `
        <div class="instructions">
            <h2>Полученная важность критериев</h2>
            <ul>
                ${normalizedWeights.map((w, i) =>
                    `<li><b>${criteria[i]}:</b> ${(w * 100).toFixed(1)}%</li>`
                ).join("")}
            </ul>
            <p style="text-align:center; margin-top:10px;">
                <b>Коэффициент согласованности CR = ${data.CR.toFixed(3)}</b>
            </p>
        </div>
    `;

    // уточнение предпочтений - механизм повышения согласованности
if (data.CR >= 0.2 && data.clarification && data.clarification.suggested_values.length > 0) {

    // Пояснения к шкале Саати
    const saatyLabels = {
        1: "равная важность",
        3: "слегка важнее",
        5: "заметно важнее",
        7: "сильно важнее",
        9: "крайне важнее"
    };

    resultDiv.innerHTML += `
        <div class="instructions">
            <h3>Уточнение предпочтений</h3>
            <p>
                Для повышения согласованности оценок предлагается уточнить
                относительную важность критериев:
            </p>
            <p style="text-align:center; font-size:16px;">
                <b>${data.clarification.criterion1}</b> по сравнению с 
                <b>${data.clarification.criterion2}</b>
            </p>
            

            <div class="clarify-container">
                ${data.clarification.suggested_values.map(opt => `
                    <button class="clarify-btn"
                        onclick="applyClarification(
                            ${data.clarification.index_i},
                            ${data.clarification.index_k},
                            ${opt.value}
                        )">
                        <div class="clarify-value">${opt.value}</div>
                        <div class="clarify-label">${saatyLabels[opt.value]}</div>
                        <div class="cr-value">CR → ${opt.cr.toFixed(3)}</div>
                    </button>
                `).join("")}
            </div>

            
        </div>
    `;
}
}



// function showResult(data) {

//     formDiv.style.display = "none";
//     document.querySelector(".instructions").style.display = "none";

//     document.getElementById("submitBtn").style.display = "none";

//     resultDiv.style.display = "block";
//     resultDiv.innerHTML = "<h2> Рейтинг квартир</h2>";

//     data.ranking.forEach((apt, index) => {
//         const isTop = index === 0 ? "top1" : "";

//         resultDiv.innerHTML += `
//             <div class="card ${isTop}">
//                 <h3>${index + 1} место — ${apt.name}</h3>
//                 <p><b>Адрес:</b> ${apt.address}</p>
//                 <p><b>Оценка:</b> ${apt.score.toFixed(3)}</p>
//                 <a href="${apt.url}" target="_blank">Открыть объявление</a>
//             </div>
//         `;
//     });

//     resultDiv.innerHTML += `
//     <div style="text-align:center; margin-top:20px;">
//         <button onclick="editAnswers()" id="editBtn">
//             ✏️ Изменить ответы
//         </button>

//         <button onclick="restartTest()" id="restartBtn">
//             🔄 Пройти заново
//         </button>
//     </div>
// `;

//     const normalizedWeights = normalizeWeights(data.weights);

//     resultDiv.innerHTML += `
//     <div class="instructions">
//         <h2>Полученная важность критериев</h2>
//         <ul>
//             ${normalizedWeights.map((w, i) =>
//                 `<li><b>${criteria[i]}:</b> ${w.toFixed(3)}</li>`
//             ).join("")}
//         </ul>
//     </div>
// `;

// if (data.CR >= 0.1 && data.clarification) {
//     resultDiv.innerHTML += `
//         <div class="instructions">
//             <h3>Уточнение предпочтений</h3>
//             <p>
//                 Ваши ответы содержат противоречия (CR = ${data.CR.toFixed(2)}).
//                 Пожалуйста, уточните, что для вас важнее:
//             </p>
//             <p>
//                 <b>${data.clarification.criterion1}</b> или 
//                 <b>${data.clarification.criterion2}</b>?
//             </p>
//         </div>
//     `;
// }

// }

window.onload = () => {
    const savedResult = localStorage.getItem("ahp_result");

     if (savedResult) {
        const data = JSON.parse(savedResult);

        if (data?.ranking?.length > 0) {
            showResult(data);
        }
    }
};

// window.onload = () => {
//     sessionStorage.removeItem("ahp_result"); 
// };

// window.onload = () => {
//     localStorage.removeItem("ahp_answers");
//     sessionStorage.removeItem("ahp_result");
// };

function editAnswers() {
    resultDiv.style.display = "none";
    formDiv.style.display = "block";
   document.querySelector(".filter-section").style.display = "block";

    document.getElementById("submitBtn").style.display = "block";
}


async function loadSurvey(surveyId) {

    const response = await fetch(`/survey/${surveyId}`);
    const survey = await response.json();

    // загружаем ответы
    answers = survey.answers;

    localStorage.setItem(
        "ahp_answers",
        JSON.stringify(answers)
    );

    // загружаем фильтры
    const filters = survey.filters || {};

    if (filters.max_price)
        document.getElementById("maxPrice").value = filters.max_price;

    if (filters.min_area)
        document.getElementById("minArea").value = filters.min_area;

    if (filters.rooms)
        document.getElementById("rooms").value = filters.rooms;

    if (filters.housing_type !== null)
        document.getElementById("housingType").value = filters.housing_type;

    if (filters.districts) {

    selectedDistricts = filters.districts;

    renderDistricts();
}

    if (filters.has_elevator !== null)
        document.getElementById("hasElevator").value = filters.has_elevator;

    if (filters.floor_type)
        document.getElementById("floorType").value = filters.floor_type;

    // пересчитать результат
    submitData();
}
window.addEventListener("DOMContentLoaded", async () => {

    const params = new URLSearchParams(window.location.search);

    const surveyId = params.get("survey_id");

    if (surveyId) {
        await loadSurvey(surveyId);
    }
});