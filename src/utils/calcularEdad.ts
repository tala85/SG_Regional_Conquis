export const calcularEdadExacta = (fechaNacimiento: Date): number => {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const mes = hoy.getMonth() - fechaNacimiento.getMonth();
  
  // Si el mes actual es menor al mes de nacimiento, o si estamos en el mismo mes pero el día actual es menor, le restamos 1 año porque aún no cumplió.
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
    edad--;
  }
  return edad;
};