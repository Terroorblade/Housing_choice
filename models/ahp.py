import numpy as np

def ahp(matrix):
    matrix = np.array(matrix, dtype=float)

    eigenvalues, eigenvectors = np.linalg.eig(matrix)
    max_index = np.argmax(eigenvalues.real)

    lambda_max = eigenvalues[max_index].real
    weights = eigenvectors[:, max_index].real
    weights = weights / np.sum(weights)

    return weights, lambda_max

#поиск противоречивой тройки улучшение ахп
def find_most_inconsistent_triplet(A):
    n = A.shape[0]
    max_inconsistency = 0
    triplet = (0, 1, 2)

    for i in range(n):
        for j in range(n):
            for k in range(n):
                if i != j and j != k and i != k:
                    inconsistency = abs(np.log(A[i, j] * A[j, k] / A[i, k]))
                    if inconsistency > max_inconsistency:
                        max_inconsistency = inconsistency
                        triplet = (i, j, k)

    return triplet

def consistency_ratio(matrix, lambda_max):
    n = len(matrix)
    CI = (lambda_max - n) / (n - 1)

    RI_table = {
        1: 0.0, 2: 0.0, 3: 0.58, 4: 0.9,
        5: 1.12, 6: 1.24, 7: 1.32,
        8: 1.41, 9: 1.45, 10: 1.49
    }

    RI = RI_table.get(n, 1.49)
    CR = CI / RI if RI != 0 else 0

    return CR