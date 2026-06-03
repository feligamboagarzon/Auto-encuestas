import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# ---------------------------------------------------------
# CONFIGURACIÓN DE DATOS (Ejemplo usando lista de diccionarios)
# Puedes adaptar esto para leer desde un archivo CSV usando el módulo 'csv' o 'pandas'
# ---------------------------------------------------------
datos_prueba = [
    {
        "texto_corto": "Juan Pérez",
        "opcion_radio": "Opción 1",    # Reemplaza con el texto exacto de tu opción (sensible a mayúsculas)
        "opcion_checkbox": "Manzana"   # Reemplaza con el texto exacto de tu casilla
    },
    {
        "texto_corto": "María Gómez",
        "opcion_radio": "Opción 2",
        "opcion_checkbox": "Naranja"
    }
]

# Reemplaza esto con la URL real de tu formulario de Google
FORM_URL = "https://docs.google.com/forms/d/e/TU_ID_DE_FORMULARIO/viewform"

def enviar_formulario(datos):
    """
    Función que abre el navegador en incógnito, llena y envía el formulario de Google.
    """
    print(f"Iniciando envío para: {datos['texto_corto']}")
    
    # 1. Configurar opciones de Chrome para modo incógnito y optimización en macOS Apple Silicon
    chrome_options = Options()
    chrome_options.add_argument("--incognito")
    # Estas opciones mejoran la estabilidad en entornos automatizados
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    # Descomenta la siguiente línea si deseas que se ejecute en segundo plano (Headless)
    # chrome_options.add_argument("--headless=new") 

    # 2. Iniciar el WebDriver usando webdriver-manager
    # webdriver-manager descargará automáticamente la versión de ChromeDriver
    # compatible con la arquitectura arm64 (Apple Silicon M1/M2/M3) si es necesario.
    service = ChromeService(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    # 3. Definir una espera explícita
    # Se esperará hasta 15 segundos para que los elementos estén interactuables
    wait = WebDriverWait(driver, 15)

    try:
        # Navegar al formulario
        driver.get(FORM_URL)

        # NOTA IMPORTANTE SOBRE LOS SELECTORES (XPATH):
        # Google Forms utiliza clases dinámicas que cambian constantemente. 
        # Es mucho más robusto buscar los elementos basándose en la estructura del DOM y los textos/roles.
        # Es probable que necesites inspeccionar el código fuente (Click derecho -> Inspeccionar) 
        # de tu formulario específico y ajustar estos XPATHs si la estructura difiere.

        # 4a. Llenar campo de Texto Corto
        # Busca el primer input de texto disponible
        xpath_texto = "//input[@type='text']"
        campo_texto = wait.until(EC.element_to_be_clickable((By.XPATH, xpath_texto)))
        campo_texto.send_keys(datos["texto_corto"])
        time.sleep(1) # Pausa breve para simular interacción humana

        # 4b. Llenar campo de Opción Múltiple (Radio Button)
        # Busca el elemento que tenga rol 'radio' y contenga un span con el texto específico de la opción
        xpath_radio = f"//div[@role='radio' and .//span[text()='{datos['opcion_radio']}']]"
        opcion_radio = wait.until(EC.element_to_be_clickable((By.XPATH, xpath_radio)))
        opcion_radio.click()
        time.sleep(1)

        # 4c. Llenar campo de Casilla de verificación (Checkbox)
        # Busca el elemento que tenga rol 'checkbox' y contenga un span con el texto específico
        xpath_checkbox = f"//div[@role='checkbox' and .//span[text()='{datos['opcion_checkbox']}']]"
        opcion_checkbox = wait.until(EC.element_to_be_clickable((By.XPATH, xpath_checkbox)))
        opcion_checkbox.click()
        time.sleep(1)

        # 5. Hacer clic en el botón 'Enviar'
        # Busca un botón que contenga el texto 'Enviar' o 'Submit' (dependiendo del idioma)
        # Prueba con 'Enviar', si tu navegador está en inglés podría ser 'Submit'
        texto_boton = "Enviar" 
        xpath_boton_enviar = f"//div[@role='button' and .//span[text()='{texto_boton}']]"
        boton_enviar = wait.until(EC.element_to_be_clickable((By.XPATH, xpath_boton_enviar)))
        boton_enviar.click()

        # Esperar a que la URL cambie indicando que se envió la respuesta
        wait.until(EC.url_contains("formResponse"))
        print(f"✅ Formulario enviado con éxito para: {datos['texto_corto']}")

    except Exception as e:
        print(f"❌ Ocurrió un error durante la ejecución: {e}")
        # Opcional: tomar una captura de pantalla en caso de error
        # driver.save_screenshot(f"error_{datos['texto_corto']}.png")
    finally:
        # Esperar un par de segundos antes de cerrar para ver el resultado y cerrar el driver correctamente
        time.sleep(2)
        driver.quit()

if __name__ == "__main__":
    print("Iniciando bot de automatización de encuestas...")
    for registro in datos_prueba:
        enviar_formulario(registro)
        # Espera unos segundos entre envíos para evitar bloqueos por parte de Google
        time.sleep(3)
    print("Ejecución finalizada.")
