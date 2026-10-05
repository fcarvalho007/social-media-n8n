import asyncio,sys,subprocess; sys.path.insert(0,'/tmp/browser/fila')
from base import *
U="http://localhost:8080/estudio/carrosseis/9a5761f3-c50c-4fed-877d-9572923ffb0c"
Q=sys.argv[1]
async def main():
  async with async_playwright() as p:
    b,pg,e=await abrir(p,1280,U)
    await pg.get_by_role("button", name="Design").first.click(); await pg.wait_for_timeout(3000)
    await pg.get_by_role("button", name="Variante B").first.click(); await pg.wait_for_timeout(800)
    await pg.get_by_role("button", name="Sugerir ritmo visual").click(); await pg.wait_for_timeout(2500)
    st=pg.get_by_text("Ritmo visual — pré-visualização").locator("..")
    print((await st.inner_text())[:600]); await st.scroll_into_view_if_needed(); await pg.screenshot(path="ritmo-B.png")
    await pg.get_by_role("button", name="Aceitar ritmo na variante B").click(); await pg.wait_for_timeout(8000)
    print("--aceite\n"+subprocess.run(["psql","-Atc",Q],capture_output=True,text=True).stdout)
    await pg.get_by_role("button", name="Reverter esta alteração").first.click(); await pg.wait_for_timeout(8000)
    print(e); await b.close()
asyncio.run(main())
