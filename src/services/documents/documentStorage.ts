export async function pickCareerDocument() {
  const DocumentPicker = await import("expo-document-picker");
  const FileSystem = await import("expo-file-system");

  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  const documentDirectory = `${FileSystem.documentDirectory}career-documents/`;
  await FileSystem.makeDirectoryAsync(documentDirectory, { intermediates: true });

  const destination = `${documentDirectory}${Date.now()}-${asset.name}`;
  await FileSystem.copyAsync({ from: asset.uri, to: destination });

  return {
    name: asset.name,
    uri: destination,
    mimeType: asset.mimeType
  };
}
