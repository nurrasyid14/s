from llm_engine import LLMEngine


llm = LLMEngine()


text = """
AC di ruang kelas rusak dan mengganggu proses belajar.
"""


result = llm.analyze(text)


print("Hasil analisis:")
print(result)