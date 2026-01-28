function AppPreview({ url }) {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden h-full">
      {url ? (
        <iframe
          src={url}
          className="w-full h-full border-0"
          title="App Preview"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>Preview apparaîtra ici après génération</p>
        </div>
      )}
    </div>
  );
}

export default AppPreview;