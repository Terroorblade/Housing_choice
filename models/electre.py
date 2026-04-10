import numpy as np

def electre(matrix, weights, alpha=0.6, beta=0.4):
    matrix = np.array(matrix)
    m, n = matrix.shape

    # диапазоны критериев
    R = np.max(matrix, axis=0) - np.min(matrix, axis=0)

    concordance = np.zeros((m, m))
    discordance = np.zeros((m, m))

    for i in range(m):
        for j in range(m):
            if i == j:
                continue

            Cij = [k for k in range(n) if matrix[i][k] >= matrix[j][k]]
            Dij = [k for k in range(n) if matrix[i][k] < matrix[j][k]]

            concordance[i][j] = sum(weights[k] for k in Cij)

            if len(Dij) == 0:
                discordance[i][j] = 0
            else:
                discordance[i][j] = max(
                    abs(matrix[i][k] - matrix[j][k]) / R[k]
                    if R[k] != 0 else 0
                    for k in Dij
                )

    dominance = np.zeros((m, m))

    for i in range(m):
        for j in range(m):
            if i != j:
                if concordance[i][j] >= alpha and discordance[i][j] <= beta:
                    dominance[i][j] = 1

    # ядро (недоминируемые альтернативы)
    kernel = []
    for i in range(m):
        if not any(dominance[j][i] == 1 for j in range(m)):
            kernel.append(i)

    return kernel, concordance, discordance