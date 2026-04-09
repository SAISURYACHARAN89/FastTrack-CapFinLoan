FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY . .
WORKDIR /src/AuthService/CapFinLoan.Auth.API
RUN dotnet restore CapFinLoan.Auth.API.csproj
RUN dotnet publish CapFinLoan.Auth.API.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "CapFinLoan.Auth.API.dll"]
