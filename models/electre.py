# import numpy as np

# def electre(matrix, weights, alpha=0.6, beta=0.4):
#     matrix = np.array(matrix, dtype=float)

#     m, n = matrix.shape

#     # Нормализация весов
#     weights = np.array(weights, dtype=float)
#     weights = weights / np.sum(weights)

#     # True = максимум лучше
#     # False = минимум лучше
#     benefit = [
#         False,  # Цена
#         True,   # Площадь
#         True,   # Тип жилья
#         False,  # Детсад
#         False,  # Школа
#         False,  # Детская поликлиника
#         False,  # Взрослая поликлиника
#         True,   # Кружки
#         True,   # Экология
#         True    # Транспорт
#     ]

#     # диапазоны критериев
#     R = np.max(matrix, axis=0) - np.min(matrix, axis=0)

#     concordance = np.zeros((m, m))
#     discordance = np.zeros((m, m))

#     for i in range(m):
#         for j in range(m):

#             if i == j:
#                 continue

#             Cij = []
#             Dij = []

#             for k in range(n):

#                 if benefit[k]:
#                     better = matrix[i][k] >= matrix[j][k]
#                 else:
#                     better = matrix[i][k] <= matrix[j][k]

#                 if better:
#                     Cij.append(k)
#                 else:
#                     Dij.append(k)

#             # Индекс согласия
#             concordance[i][j] = sum(weights[k] for k in Cij)

#             # Индекс несогласия
#             if len(Dij) == 0:
#                 discordance[i][j] = 0

#             else:
#                 discordance[i][j] = max(
#                     abs(matrix[i][k] - matrix[j][k]) / R[k]
#                     if R[k] != 0 else 0
#                     for k in Dij
#                 )

#     # Матрица доминирования
#     dominance = np.zeros((m, m))

#     for i in range(m):
#         for j in range(m):

#             if i != j:

#                 if (
#                     concordance[i][j] >= alpha
#                     and
#                     discordance[i][j] <= beta
#                 ):
#                     dominance[i][j] = 1

#     # Ядро Парето / недоминируемые альтернативы
#     kernel = []

#     for i in range(m):

#         dominated = False

#         for j in range(m):

#             if dominance[j][i] == 1:
#                 dominated = True
#                 break

#         if not dominated:
#             kernel.append(i)

#     return kernel, concordance, discordance

import numpy as np

def electre(matrix, weights, criteria_types, alpha=0.6, beta=0.4):
    """
    Метод ELECTRE I для многокритериального выбора.
    
    Параметры:
    ----------
    matrix : list[list[float]]
        Матрица решений (m альтернатив × n критериев)
    weights : list[float]
        Веса критериев (нормированные, сумма = 1)
    criteria_types : list[str]
        Типы критериев: 'benefit' (больше — лучше) или 'cost' (меньше — лучше)
    alpha : float
        Порог согласия (по умолчанию 0.6)
    beta : float
        Порог несогласия (по умолчанию 0.4)
    
    Возвращает:
    -----------
    kernel : list[int]
        Индексы недоминируемых альтернатив (ядро Парето)
    concordance : np.array
        Матрица индексов согласия
    discordance : np.array
        Матрица индексов несогласия
    """
    matrix = np.array(matrix, dtype=float)
    m, n = matrix.shape
    weights = np.array(weights, dtype=float)
    
    # Нормализация весов
    weights = weights / np.sum(weights)
    
    # Вычисление диапазонов критериев
    R = np.max(matrix, axis=0) - np.min(matrix, axis=0)
    R[R == 0] = 1e-10  # защита от деления на 0
    
    # Инициализация матриц
    concordance = np.zeros((m, m))
    discordance = np.zeros((m, m))
    
    for i in range(m):
        for j in range(m):
            if i == j:
                continue
            
            # Множество критериев согласия: где Ai не хуже Aj
            Cij = []
            Dij = []
            
            for k in range(n):
                if criteria_types[k] == 'benefit':
                    # Для benefit: больше — лучше
                    if matrix[i][k] >= matrix[j][k]:
                        Cij.append(k)
                    else:
                        Dij.append(k)
                else:  # 'cost'
                    # Для cost: меньше — лучше
                    if matrix[i][k] <= matrix[j][k]:
                        Cij.append(k)
                    else:
                        Dij.append(k)
            
            # Индекс согласия: доля весов критериев согласия
            concordance[i][j] = np.sum(weights[Cij])
            
            # Индекс несогласия: максимальное относительное различие
            if len(Dij) == 0:
                discordance[i][j] = 0
            else:
                diffs = []
                for k in Dij:
                    if criteria_types[k] == 'benefit':
                        diff = (matrix[j][k] - matrix[i][k]) / R[k]
                    else:
                        diff = (matrix[i][k] - matrix[j][k]) / R[k]
                    diffs.append(diff)
                discordance[i][j] = max(diffs)
    
    # Построение отношения доминирования
    dominance = np.zeros((m, m), dtype=int)
    
    for i in range(m):
        for j in range(m):
            if i != j:
                # Ai доминирует Aj, если согласие >= alpha И несогласие <= beta
                if concordance[i][j] >= alpha and discordance[i][j] <= beta:
                    dominance[i][j] = 1
    
    # Выделение ядра (недоминируемые альтернативы)
    kernel = []
    for i in range(m):
        if not any(dominance[j][i] == 1 for j in range(m) if j != i):
            kernel.append(i)
    
    return kernel, concordance, discordance