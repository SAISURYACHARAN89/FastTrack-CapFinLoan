FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY . .
WORKDIR /src/AdminService/CapFinLoan.Admin.API
RUN dotnet restore CapFinLoan.Admin.API.csproj
RUN dotnet publish CapFinLoan.Admin.API.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "CapFinLoan.Admin.API.dll"]
