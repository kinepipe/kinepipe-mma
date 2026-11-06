using System;
using System.IO;
using System.Linq;
using Mono.Cecil;
using Mono.Cecil.Cil;

namespace KinePipe.Patcher
{
    class Program
    {
        static int Main(string[] args)
        {
            try
            {
                string targetDir = args.Length > 0 ? args[0] : AppDomain.CurrentDomain.BaseDirectory;
                bool uninstall = args.Any(a => a.Equals("--uninstall", StringComparison.OrdinalIgnoreCase));

                targetDir = Path.GetFullPath(targetDir.Trim('"', '\\', '/'));
                string screenMgrDll = Path.Combine(targetDir, "Kinovea.ScreenManager.dll");
                string backupDll = Path.Combine(targetDir, "Kinovea.ScreenManager.dll.bak");
                string pluginDll = Path.Combine(targetDir, "Kinovea.Markerless.dll");

                if (!File.Exists(screenMgrDll))
                {
                    Console.Error.WriteLine("[ERROR] No se encontró Kinovea.ScreenManager.dll en: " + targetDir);
                    return 1;
                }

                if (uninstall)
                {
                    if (File.Exists(backupDll))
                    {
                        File.Copy(backupDll, screenMgrDll, true);
                        Console.WriteLine("[OK] Kinovea.ScreenManager.dll restaurado desde respaldo .bak");
                    }
                    if (File.Exists(pluginDll))
                    {
                        File.Delete(pluginDll);
                        Console.WriteLine("[OK] Kinovea.Markerless.dll eliminado.");
                    }
                    return 0;
                }

                if (!File.Exists(pluginDll))
                {
                    Console.Error.WriteLine("[ERROR] No se encontró Kinovea.Markerless.dll en: " + targetDir);
                    return 2;
                }

                if (!File.Exists(backupDll))
                {
                    File.Copy(screenMgrDll, backupDll, false);
                    Console.WriteLine("[OK] Respaldo creado: Kinovea.ScreenManager.dll.bak");
                }

                DefaultAssemblyResolver resolver = new DefaultAssemblyResolver();
                resolver.AddSearchDirectory(targetDir);

                ReaderParameters rParams = new ReaderParameters()
                {
                    AssemblyResolver = resolver,
                    ReadWrite = false,
                    InMemory = true
                };

                using (AssemblyDefinition targetAsm = AssemblyDefinition.ReadAssembly(screenMgrDll, rParams))
                using (AssemblyDefinition pluginAsm = AssemblyDefinition.ReadAssembly(pluginDll, rParams))
                {
                    TypeDefinition kernelType = targetAsm.MainModule.GetType("Kinovea.ScreenManager.ScreenManagerKernel");
                    if (kernelType == null)
                    {
                        Console.Error.WriteLine("[ERROR] No se encontró el tipo ScreenManagerKernel.");
                        return 3;
                    }

                    MethodDefinition extendMenu = kernelType.Methods.FirstOrDefault(m => m.Name == "ExtendMenu" && m.Parameters.Count == 1);
                    if (extendMenu == null)
                    {
                        Console.Error.WriteLine("[ERROR] No se encontró el método ExtendMenu(ToolStrip).");
                        return 4;
                    }

                    // Check if already patched
                    bool alreadyPatched = extendMenu.Body.Instructions.Any(
                        ins => ins.OpCode == OpCodes.Call &&
                               ins.Operand != null &&
                               ins.Operand.ToString().Contains("MarkerlessBootstrap::Initialize")
                    );

                    if (alreadyPatched)
                    {
                        Console.WriteLine("[INFO] Kinovea.ScreenManager.dll ya cuenta con el hook IL de KinePipe Markerless AI.");
                        return 0;
                    }

                    TypeDefinition bootstrapType = pluginAsm.MainModule.GetType("Kinovea.Markerless.MarkerlessBootstrap");
                    MethodDefinition initMethod = bootstrapType.Methods.First(m => m.Name == "Initialize");
                    MethodReference initRef = targetAsm.MainModule.ImportReference(initMethod);

                    ILProcessor il = extendMenu.Body.GetILProcessor();
                    Instruction retInstr = extendMenu.Body.Instructions.Last(i => i.OpCode == OpCodes.Ret);

                    // Inject: MarkerlessBootstrap.Initialize(this, menu);
                    Instruction ldarg0 = il.Create(OpCodes.Ldarg_0);
                    Instruction ldarg1 = il.Create(OpCodes.Ldarg_1);
                    Instruction callInit = il.Create(OpCodes.Call, initRef);

                    il.InsertBefore(retInstr, ldarg0);
                    il.InsertBefore(retInstr, ldarg1);
                    il.InsertBefore(retInstr, callInit);

                    targetAsm.Write(screenMgrDll);
                    Console.WriteLine("[OK] Hook IL inyectado exitosamente en Kinovea.ScreenManager.ScreenManagerKernel::ExtendMenu.");
                }

                return 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("[ERROR] Excepción durante el parcheo IL: " + ex.ToString());
                return 99;
            }
        }
    }
}

