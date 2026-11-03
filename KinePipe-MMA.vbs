Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

If Not fso.FileExists(scriptDir & "\.venv\Scripts\python.exe") Then
    ' Primera ejecucion: mostrar consola visible para instalar librerias con claridad
    WshShell.Run "cmd /c install.bat --no-pause && run_desktop.bat --no-pause", 1, False
Else
    ' Entorno ya instalado: lanzar aplicacion sin bloquear en pausa oculta
    WshShell.Run "cmd /c run_desktop.bat --no-pause", 0, False
End If

Set fso = Nothing
Set WshShell = Nothing
