import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

from sklearn.datasets import fetch_california_housing

data = fetch_california_housing(as_frame=True)

df = data.frame

print(df.head())