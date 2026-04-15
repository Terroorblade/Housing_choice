

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
// let answers = JSON.parse(localStorage.getItem("ahp_answers") || "{}");
let answers = {};


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

async function submitData() {
    const matrix = buildMatrix();
    if (!matrix) return;

    const response = await fetch("/ahp", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ matrix })
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
    sessionStorage.removeItem("ahp_result");
    location.reload();
}


function clarifyPreference(i, k, value) {
    // Обновляем соответствующий элемент матрицы парных сравнений
    const n = criteria.length;

    // Определяем индекс пары (i, k)
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

    // Сохраняем ответы
    localStorage.setItem("ahp_answers", JSON.stringify(answers));

    // Повторный расчёт
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


//улучшение весов вариант 2

function showResult(data) {
    formDiv.style.display = "none";
    document.querySelector(".instructions").style.display = "none";
    document.getElementById("submitBtn").style.display = "none";

    resultDiv.style.display = "block";
    resultDiv.innerHTML = "<h2>Рейтинг квартир</h2>";

    // Вывод рейтинга квартир
    data.ranking.forEach((apt, index) => {
        const isTop = index === 0 ? "top1" : "";
        resultDiv.innerHTML += `
            <div class="card ${isTop}">
                <h3>${index + 1} место — ${apt.name}</h3>
                <p><b>Адрес:</b> ${apt.address}</p>
                <p><b>Оценка:</b> ${(apt.score * 100).toFixed(1)}%</p>
                <a href="${apt.url}" target="_blank">Открыть объявление</a>
            </div>
        `;
    });

    // Кнопки редактирования
    resultDiv.innerHTML += `
        <div style="text-align:center; margin-top:20px;">
            <button onclick="editAnswers()" id="editBtn">✏️ Изменить ответы</button>
            <button onclick="restartTest()" id="restartBtn">🔄 Пройти заново</button>
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

    // --- Уточняющий вопрос с "умными" подсказками ---
    // --- Уточняющий вопрос с "умными" подсказками ---
if (data.CR >= 0.15 && data.clarification && data.clarification.suggested_values.length > 0) {

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

// window.onload = () => {
//     const savedResult = localStorage.getItem("ahp_result");

//     if (savedResult) {
//         showResult(JSON.parse(savedResult));
//     }
// };

// window.onload = () => {
//     sessionStorage.removeItem("ahp_result"); 
// };

window.onload = () => {
    localStorage.removeItem("ahp_answers");
    sessionStorage.removeItem("ahp_result");
};

function editAnswers() {
    resultDiv.style.display = "none";
    formDiv.style.display = "block";

    document.getElementById("submitBtn").style.display = "block";
}

