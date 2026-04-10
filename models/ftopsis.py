import numpy as np

# расстояние между треугольными числами
def distance(a, b):
    return np.sqrt((1/3) * (
        (a[0] - b[0])**2 +
        (a[1] - b[1])**2 +
        (a[2] - b[2])**2
    ))


def normalize(matrix, criteria_types):
    m, n = len(matrix), len(matrix[0])
    result = []

    for j in range(n):
        col = [matrix[i][j] for i in range(m)]

        if criteria_types[j] == "benefit":
            max_u = max(x[2] for x in col)
            norm_col = [
                (x[0]/max_u, x[1]/max_u, x[2]/max_u)
                for x in col
            ]
        else:
            min_l = min(x[0] for x in col)
            norm_col = [
                (min_l/x[2], min_l/x[1], min_l/x[0])
                for x in col
            ]

        for i in range(m):
            if j == 0:
                result.append([])
            result[i].append(norm_col[i])

    return result


def weighted_matrix(norm_matrix, weights):
    result = []
    for i in range(len(norm_matrix)):
        row = []
        for j in range(len(norm_matrix[0])):
            w = weights[j]
            a = norm_matrix[i][j]
            row.append((a[0]*w, a[1]*w, a[2]*w))
        result.append(row)
    return result


def ftopsis(matrix, weights, criteria_types):
    norm = normalize(matrix, criteria_types)
    weighted = weighted_matrix(norm, weights)

    m, n = len(weighted), len(weighted[0])

    A_plus = [(1,1,1)] * n
    A_minus = [(0,0,0)] * n

    D_plus = []
    D_minus = []

    for i in range(m):
        d_p = sum(distance(weighted[i][j], A_plus[j]) for j in range(n))
        d_m = sum(distance(weighted[i][j], A_minus[j]) for j in range(n))

        D_plus.append(d_p)
        D_minus.append(d_m)

    CC = [D_minus[i] / (D_plus[i] + D_minus[i]) for i in range(m)]

    return CC