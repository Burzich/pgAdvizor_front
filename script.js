const API_BASE_URL = window.API_BASE_URL;

// Основной класс для управления SQL анализатором
class SQLAnalyzer {
    constructor() {
        this.initializeElements();
        this.bindEvents();
    }

    // Инициализация DOM элементов
    initializeElements() {
        this.sqlQueryInput = document.getElementById('sqlQuery');
        this.checkButton = document.getElementById('checkButton');
        this.analyzer1 = document.getElementById('analyzer1');
        this.analyzer2 = document.getElementById('analyzer2');
        this.resultsSection = document.getElementById('resultsSection');
        this.queryDisplay = document.getElementById('queryDisplay');
        this.analyzersDisplay = document.getElementById('analyzersDisplay');
        
        // Новые элементы для заголовка и модального окна
        this.dbButton = document.getElementById('dbButton');
        this.downloadButton = document.getElementById('downloadButton');
        this.dbModal = document.getElementById('dbModal');
        this.modalClose = document.getElementById('modalClose');
        this.dbParamsBody = document.getElementById('dbParamsBody');

        // События для галочек анализаторов
        this.analyzer1.addEventListener('change', () => this.handleAnalyzer1Change());
        this.analyzer2.addEventListener('change', () => this.handleAnalyzer2Change());
    }

    // Привязка событий
    bindEvents() {
        this.checkButton.addEventListener('click', () => this.handleCheck());
        
        // Новые события для кнопок заголовка
        this.dbButton.addEventListener('click', () => this.openDbModal());
        this.modalClose.addEventListener('click', () => this.closeDbModal());
        this.downloadButton.addEventListener('click', () => this.handleDownload());
        
        // Закрытие модального окна при клике вне его
        window.addEventListener('click', (event) => {
            if (event.target === this.dbModal) {
                this.closeDbModal();
            }
        });
    }

    // Обработка изменения галочек анализаторов
    handleAnalyzer1Change() {
        // Проверяем, что хотя бы одна галочка включена
        if (!this.analyzer1.checked && !this.analyzer2.checked) {
            // Если обе галочки сняты, включаем первую
            this.analyzer2.checked = true;
        }
    }

    handleAnalyzer2Change() {
        // Проверяем, что хотя бы одна галочка включена
        if (!this.analyzer1.checked && !this.analyzer2.checked) {
            // Если обе галочки сняты, включаем вторую
            this.analyzer1.checked = true;
        }
    }

    // Получение результатов анализа с сервера
    async fetchQuerySuggestions(sqlQuery) {
        const response = await fetch(`${API_BASE_URL}/api/suggestions/query?query=${encodeURIComponent(sqlQuery)}`);
        if (!response.ok) throw new Error(`Ошибка API: ${response.status}`);
        return await response.json();
    }
    
    // Обработка нажатия кнопки "Проверить"
    async handleCheck() {
        try {
            // Вырубаем всё
            this.resultsSection.style.display = 'none';

            // Показываем индикатор загрузки
            this.checkButton.textContent = 'Проверяем...';
            this.checkButton.disabled = true;

            // Получаем данные из формы
            const formData = this.getFormData();

            // Получаем результаты анализа с сервера
            const suggestions = await this.fetchQuerySuggestions(formData.sqlQuery);
            this.showResults(formData, suggestions);
            
        } catch (error) {
            console.error('Ошибка при проверке:', error);
            alert('Произошла ошибка при проверке запроса');
        } finally {
            // Восстанавливаем кнопку
            this.checkButton.textContent = 'Проверить';
            this.checkButton.disabled = false;
        }
    }

    // Получение данных из формы
    getFormData() {
        return {
            sqlQuery: this.sqlQueryInput.value.trim(),
            analyzers: {
                analyzer1: this.analyzer1.checked,
                analyzer2: this.analyzer2.checked
            }
        };
    }

    // Отображение результатов анализа
    showResults(formData, suggestions) {
        this.resultsSection.style.display = 'block';
    
        this.queryDisplay.textContent = formData.sqlQuery || 'Запрос не введен';
        this.analyzersDisplay.innerHTML = '';
    
        // Теги анализаторов
        Object.entries(formData.analyzers).forEach(([key, enabled]) => {
            if (enabled) {
                const label = this[key].parentElement.textContent.trim();
                const tag = document.createElement('span');
                tag.className = 'analyzer-tag';
                tag.textContent = label;
                this.analyzersDisplay.appendChild(tag);
            }
        });
    
        // STATIC/LLM выводим на основе ответа сервера
        const staticResults = document.getElementById('staticResults');
        const llmResults = document.getElementById('llmResults');
        const staticContent = document.querySelector('.static-content');
        const llmContent = document.querySelector('.llm-content');
    
        staticContent.innerHTML = '';
        llmContent.innerHTML = '';
    
        suggestions.forEach(s => {
            const p = document.createElement('p');
            p.textContent = `[${s.severity}] ${s.message} (${s.fix})`;
            if (s.source === 'static-analyzer') {
                staticResults.style.display = 'block';
                staticContent.appendChild(p);
            } else {
                llmResults.style.display = 'block';
                llmContent.appendChild(p);
            }
        });
    
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Открытие модального окна с параметрами БД
    openDbModal() {
        this.dbModal.style.display = 'block';
        this.populateDbParamsTable();
        document.body.style.overflow = 'hidden'; // Блокируем прокрутку страницы
    }

    // Закрытие модального окна
    closeDbModal() {
        this.dbModal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Восстанавливаем прокрутку страницы
    }

    // Обработка кнопки скачивания
    handleDownload() {
        try {
            // Проверяем, есть ли результаты для скачивания
            if (!this.resultsSection.style.display || this.resultsSection.style.display === 'none') {
                alert('Сначала выполните анализ SQL-запроса');
                return;
            }

            // Собираем данные для скачивания
            const downloadData = this.prepareDownloadData();
            
            // Создаем и скачиваем файл
            this.downloadTextFile(downloadData, 'sql_analysis_results.txt');
            
        } catch (error) {
            console.error('Ошибка при скачивании:', error);
            alert('Произошла ошибка при скачивании файла');
        }
    }

    // Подготовка данных для скачивания
    prepareDownloadData() {
        const sqlQuery = this.sqlQueryInput.value.trim() || 'Запрос не введен';
        const analyzer1Enabled = this.analyzer1.checked;
        const analyzer2Enabled = this.analyzer2.checked;
        
        let content = 'РЕЗУЛЬТАТЫ АНАЛИЗА SQL-ЗАПРОСА\n';
        content += '=====================================\n\n';
        
        // SQL-запрос
        content += 'SQL-ЗАПРОС:\n';
        content += '------------\n';
        content += sqlQuery + '\n\n';
        
        // Включенные анализаторы
        content += 'Опции:\n';
        content += '------------------------\n';
        if (analyzer1Enabled) content += '• STATIC\n';
        if (analyzer2Enabled) content += '• LLM\n';
        content += '\n';
        
        // Результаты STATIC анализа
        if (analyzer1Enabled) {
            content += 'STATIC:\n';
            content += '---------------------------\n';
            // Используем последние полученные результаты анализа, а не моки
            const staticContent = document.querySelector('.static-content');
            const staticResults = Array.from(staticContent.querySelectorAll('p')).map(p => p.textContent);
            staticResults.forEach(result => {
            content += '• ' + result + '\n';
            });
            content += '\n';
        }
        
        // Результаты LLM анализа
        if (analyzer2Enabled) {
            content += 'LLM:\n';
            content += '------------------------\n';
            const llmContent = document.querySelector('.llm-content');
            const llmResults = Array.from(llmContent.querySelectorAll('p')).map(p => p.textContent);
            llmResults.forEach(result => {
            content += '• ' + result + '\n';
            });
            content += '\n';
        }
        
        // Временная метка
        content += 'ВРЕМЯ АНАЛИЗА: ' + new Date().toLocaleString('ru-RU') + '\n';
        
        return content;
    }

    // Скачивание текстового файла
    downloadTextFile(content, filename) {
        // Создаем Blob с содержимым файла
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        
        // Создаем ссылку для скачивания
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        // Добавляем ссылку в DOM, кликаем по ней и удаляем
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Освобождаем память
        window.URL.revokeObjectURL(url);
        
        console.log('Файл успешно скачан:', filename);
    }

    // Получение конфигурации с сервера
    async fetchConfig() {
        const response = await fetch(`${API_BASE_URL}/api/suggestions/config`);
        if (!response.ok) throw new Error(`Ошибка API: ${response.status}`);
        return await response.json();
    }

    // Заполнение таблицы параметров БД
    async populateDbParamsTable() {
        this.dbParamsBody.innerHTML = '';
        try {
            const dbParams = await this.fetchConfig();
    
            dbParams.forEach(param => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${param.name}</strong></td>
                    <td><code>${param.parameter}</code></td>
                    <td><span class="recommended-cold">${param.recommended_parameter_cold}</span></td>
                    <td><span class="recommended-hot">${param.recommended_parameter_hot}</span></td>
                    <td>${param.description}</td>
                `;
                this.dbParamsBody.appendChild(tr);
            });
        } catch (e) {
            console.error('Ошибка при загрузке конфигурации:', e);
            this.dbParamsBody.innerHTML = `<tr><td colspan="5">Ошибка загрузки параметров</td></tr>`;
        }
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new SQLAnalyzer();
});

// Дополнительные утилиты для работы с формой
document.addEventListener('DOMContentLoaded', () => {
    // Автоматическое изменение размера textarea при вводе
    const textarea = document.getElementById('sqlQuery');
    
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 300) + 'px';
    });

    // Валидация SQL-запроса (базовая)
    textarea.addEventListener('blur', function() {
        const query = this.value.trim();
        if (query && !query.toLowerCase().includes('select')) {
            this.style.borderColor = '#dc3545';
        } else {
            this.style.borderColor = '#dee2e6';
        }
    });
});
