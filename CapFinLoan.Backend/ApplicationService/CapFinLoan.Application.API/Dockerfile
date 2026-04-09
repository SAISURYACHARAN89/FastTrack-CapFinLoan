FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY . .
WORKDIR /src/ApplicationService/CapFinLoan.Application.API
RUN dotnet restore CapFinLoan.Application.API.csproj
RUN dotnet publish CapFinLoan.Application.API.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "CapFinLoan.Application.API.dll"]
