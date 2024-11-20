import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx"; 
import "../style/FileList.css"; 

const FileList = () => {
  const [files, setFiles] = useState([]);
  const [selectedFileIds, setSelectedFileIds] = useState([]);

  // Получаем список файлов с бэкенда 
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await axios.get("http://localhost:5076/api/files/files"); 
        setFiles(response.data.$values || []); // Сохраняем файлы в состояние
      } catch (error) {
        console.error("Error fetching files", error); 
      }
    };
    fetchFiles();
  }, []); // Пустой массив, чтобы запрос выполнился только один раз

  // Проверяем, нужно ли выделить строку с номером счета
  const highlightAccountNumber = (accountNumber) => {
    return accountNumber.includes("ПО КЛАССУ") || /^\d{2}$/.test(accountNumber);
  };

  // Группируем аккаунты по классу счета
  const groupByClass = (accounts) => {
    return accounts.reduce((grouped, account) => {
      const { accountClass } = account;
      if (!grouped[accountClass]) {
        grouped[accountClass] = [];
      }
      grouped[accountClass].push(account);
      return grouped;
    }, {});
  };

  // Экспортируем данные в формат Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new(); // Создаем новый рабочий файл Excel

    files.forEach((file) => {
      if (!selectedFileIds.includes(file.id)) return; // Пропускаем, если файл не выбран

      const groupedAccounts = groupByClass(file.accounts.$values || []);
      const sheetData = [];

      // Добавляем заголовки и информацию о файле
      sheetData.push([`Название банка: ${file.bankName}`]);
      sheetData.push(['Оборотная ведомость по балансовым счетам']);
      sheetData.push(['за период с 01.01.2016 по 31.12.2016']);
      sheetData.push(['по банку:']);
      sheetData.push([`1/1/2017 0:00:00 в руб. ${file.bankName}`]);

      // Добавляем данные о счетах, сгруппированные по классам
      Object.keys(groupedAccounts).forEach((accountClass) => {
        sheetData.push([` ${accountClass}`]);
        sheetData.push(['Б/сч', 'Входящее сальдо (Актив)', 'Входящее сальдо (Пассив)', 'Обороты (Дебет)', 'Обороты (Кредит)', 'Исходящее сальдо (Актив)', 'Исходящее сальдо (Пассив)']);
        
        groupedAccounts[accountClass].forEach((account) => {
          const highlightRow = highlightAccountNumber(account.accountNumber); // Проверка на выделение строки
          sheetData.push([ 
            account.accountNumber, 
            account.openingActive, 
            account.openingPassive, 
            account.debit, 
            account.credit, 
            account.closingActive, 
            account.closingPassive 
          ]);
        });
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetData); // Преобразуем данные в лист Excel

      // Настройка стилей для первой строки (заголовки)
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
          if (cell) {
            if (row === 0 || row === 1 || row === 2) {
              cell.s = {
                font: { bold: true, size: 12 },
                alignment: { horizontal: "center" },
                border: { 
                  top: { style: "thin" }, 
                  bottom: { style: "thin" },
                  left: { style: "thin" },
                  right: { style: "thin" }
                }
              };
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, file.bankName); // Добавляем лист в книгу Excel
    });

    XLSX.writeFile(wb, "files_data.xlsx"); // Сохраняем файл Excel
  };

  // Обрабатываем выбор файлов пользователем
  const handleFileSelection = (fileId) => {
    setSelectedFileIds((prevSelectedFileIds) =>
      prevSelectedFileIds.includes(fileId)
        ? prevSelectedFileIds.filter((id) => id !== fileId)
        : [...prevSelectedFileIds, fileId]
    );
  };

  return (
    <div className="file-list">
      <h2>Список загруженных файлов</h2>

      {/* Выводим список файлов с чекбоксами для выбора */}
      <div className="file-selection">
        {files.length > 0 && files.map((file) => (
          <div key={file.id} className="file-item">
            <input
              type="checkbox"
              checked={selectedFileIds.includes(file.id)}
              onChange={() => handleFileSelection(file.id)}
            />
            <label>{file.fileName}</label> 
          </div>
        ))}
      </div>
      
      {/* Для каждого выбранного файла отображаем его данные в таблице */}
      {files.length > 0 && files.map((file) => {
        const groupedAccounts = groupByClass(file.accounts.$values || []);

        return (
          <div key={file.id} className="account-table-wrapper">
            {selectedFileIds.includes(file.id) && (
              <>
                <table className="header-table">
                  <thead>
                    <tr>
                      <td className="title">Название банка: {file.bankName}</td>
                    </tr>
                    <tr>
                      <td colSpan="6" className="centered-text">
                        Оборотная ведомость по балансовым счетам
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="6" className="centered-text">
                        за период с 01.01.2016 по 31.12.2016 
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="6" className="centered-text">
                        по банку:
                      </td>
                    </tr>
                    <tr>
                    <td colSpan="6" className="sumOnDate">
                    <p>
                      1/1/2017 0:00:00                                       </p>
                      <p>
                      в руб. {file.bankName}
                      </p>
                      </td>
                    </tr>
                  </thead>
                </table>
                
                {/* Отображаем данные по аккаунтам в виде таблиц */}
                {Object.keys(groupedAccounts).map((accountClass) => (
                  <div key={accountClass}>
                    <h4 className="class-header">{` ${accountClass}`}</h4>
                    <table className="account-table">
                      <thead>
                        <tr>
                          <th>Б/сч</th>
                          <th>Входящее сальдо (Актив)</th>
                          <th>Входящее сальдо (Пассив)</th>
                          <th>Обороты (Дебет)</th>
                          <th>Обороты (Кредит)</th>
                          <th>Исходящее сальдо (Актив)</th>
                          <th>Исходящее сальдо (Пассив)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedAccounts[accountClass].map((account) => {
                          const highlightRow = highlightAccountNumber(account.accountNumber); // Проверка для выделения строки
                          return (
                            <tr key={account.id}>
                              <td className={highlightRow ? 'highlight-text' : ''}>
                                {account.accountNumber}
                              </td>
                              <td className={highlightRow ? 'highlight-text' : ''}>
                                {account.openingActive}
                              </td>
                              <td className={highlightRow ? 'highlight-text' : ''}>
                                {account.openingPassive}
                              </td>
                              <td className={highlightRow ? 'highlight-text' : ''}>
                                {account.debit}
                              </td>
                              <td className={highlightRow ? 'highlight-text' : ''}>
                                {account.credit}
                              </td>
                              <td className={highlightRow ? 'highlight-text' : ''}>
                                {account.closingActive}
                              </td>
                              <td className={highlightRow ? 'highlight-text' : ''}>
                                {account.closingPassive}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })}

      {/* Кнопка для экспорта данных в Excel */}
      <button onClick={exportToExcel} className="export-button">
        Экспортировать в Excel
      </button>
    </div>
  );
};

export default FileList;
