// import { initController } from "C:/Users/icust/OneDrive/Documentos/OneDrive/Documentos/Bootcamp Developer/NEOLAND/Clonado Nuevo/Ejercicio-25-09/Javascript/Proyecto Final JS copy/Mi Proyecto/Hub de Juegos/utils/initController";
import "./Login.css"

const templateLogin = () => `
<div class="containerlogin">
    <div class="containerlogo">
        <img src="https://github.com/marionovaro/Ejercicio-25-09/blob/main/Javascript/Proyecto%20Final%20JS%20copy/Login/Logo%20Hub%20de%20Juegos.png?raw=true">
    </div>
    <div class="instruccion">
        <h1>INTRODUCE TU NOMBRE!</h1>
    </div>
    <div class="contenido">
        <input type="text" placeholder="Nombre y Apellido">
        <button type="submit">👍🏽</button>
    </div>
</div>
`


export const Login = () => {
    document.querySelector("#app").innerHTML = templateLogin();
}
