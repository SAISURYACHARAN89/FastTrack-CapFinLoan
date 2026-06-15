FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY . .
WORKDIR /src/WalletService/CapFinLoan.Wallet.API
RUN dotnet restore CapFinLoan.Wallet.API.csproj
RUN dotnet publish CapFinLoan.Wallet.API.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "CapFinLoan.Wallet.API.dll"]
