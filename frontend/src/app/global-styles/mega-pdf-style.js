import { StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  //MIS ESTILOS
  layout: {
    flexDirection: "column",
  },
  encabezado: {
    flexDirection: "row",
    width: "100%",
    paddingBottom: "16px",
    paddingTop: "16px",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
  },
  encabezadoLogo: {
    alignItems: "center",
    flex: 3,
  },
  encabezadoTitulo: {
    fontSize: 16,
    textAlign: "center",
    flex: 6,
    fontWeight: "bold",
  },
  encabezadoFecha: {
    flex: 3,
  },
  contenido: {
    flexDirection: "column",
  },
  contenidoData: {
    backgroundColor: "#eee",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#d8d8d8",
    borderBottomStyle: "solid",
  },
  contenidoData2: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#d8d8d8",
    borderBottomStyle: "solid",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  rowTop2: {
    flexDirection: "row",
    marginBottom: 16,
  },

  seccionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    textAlign: "center",
    fontWeight: "bold",
    width: "100%",
    marginTop: 4,
    backgroundColor: "#d8d8d8",
    paddingVertical: 4,
  },

  contenidoDataItem: {
    flex: 4,
    paddingHorizontal: 8,
  },

    contenidoDataItem3: {
    flex: 3,
    paddingHorizontal: 8,
  },

  contenidoDataItem2: {
    flex: 2,
    paddingHorizontal: 8,
  },

    contenidoDataItem1: {
    flex: 1,
    paddingHorizontal: 8,
  },

  contenidoTable: {
    paddingVertical: 4,
    paddingHorizontal: 32,
  },
  contenidoAuth: {
    paddingHorizontal: 32,
    flexDirection: "row",
    paddingTop: "16px",
  },
  contenidoAuthFirma: {
    flex: 6,
  },
  contenidoAuthInfo: {
    flex: 6,
  },

  fsmall: {
    fontSize: 10,
  },
  //FIN MIS ESTILOS

  label: {
    fontWeight: "bold",
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #ccc",
    paddingVertical: 1,
    paddingHorizontal: 4,
  },

  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 1,
    paddingHorizontal: 4,
    backgroundColor: "#f2f2f2", // Gris muy claro
  },
  tableHeader: {
    fontWeight: "bold",
    backgroundColor: "#f2f2f2",
    fontSize: 12,
  },
  cell: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  cellNumber: {
    width: "20px",
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  firma: {
    marginTop: 30,
    fontSize: 10,
  },
  firmaImage: {
    backgroundColor: "#ffffff",
    width: "50%",
    height: "auto",
  },
});

export default styles;
