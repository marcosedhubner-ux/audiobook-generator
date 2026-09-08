import { cancel, isCancel, select } from "@clack/prompts";
import { listBookFiles, listContentFolders, resolveBookPath } from "../utils/paths.js";

function abortIfCancelled(value) {
  if (isCancel(value)) {
    cancel("Operacao cancelada.");
    process.exit(0);
  }
  return value;
}

export async function selectBookFlow() {
  const folders = await listContentFolders();
  if (folders.length === 0) {
    throw new Error(
      "Nenhuma pasta encontrada dentro de Conteudo/. Crie uma pasta com o nome do livro e coloque o PDF ou TXT dentro dela."
    );
  }

  const folderName = abortIfCancelled(
    await select({
      message: "Qual pasta de Conteudo voce quer narrar?",
      options: folders.map((name) => ({ value: name, label: name })),
    })
  );

  const files = await listBookFiles(folderName);
  if (files.length === 0) {
    throw new Error(`Nenhum arquivo .pdf ou .txt encontrado em Conteudo/${folderName}.`);
  }

  const fileName = abortIfCancelled(
    await select({
      message: `Qual arquivo dentro de "${folderName}" voce quer narrar?`,
      options: files.map((name) => ({ value: name, label: name })),
    })
  );

  return { folderName, fileName, filePath: resolveBookPath(folderName, fileName) };
}
