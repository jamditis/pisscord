; Custom NSIS script to handle running Pisscord instances

!macro customInit
  ; Kill any running Pisscord processes before installation
  nsExec::ExecToLog 'taskkill /f /im "Pisscord.exe"'
  ; Wait a moment for processes to fully terminate
  Sleep 1000
!macroend

!macro customInstall
  ; Additional custom install steps if needed
!macroend

!macro customUnInstall
  ; Kill any running Pisscord processes before uninstallation
  nsExec::ExecToLog 'taskkill /f /im "Pisscord.exe"'
  Sleep 1000
!macroend
