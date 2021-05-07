/*
** LWC to upload csv file in order to load Commercial Properties
** Developer: Aaron Dominguez
** Date: 30/04/2021
*/ 

import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { OmniscriptBaseMixin } from 'vlocity_ins/omniscriptBaseMixin';

const FILE_FORMATS = ['.csv'];
const MAX_FILE_SIZE = 2000000; //Max file size 2.0 MB

export default class VlocityCSVFileParser extends OmniscriptBaseMixin(LightningElement) {
    
    @track columns = [];
    @track data;
    @track rowTotals = 0;
    @track keyField;
    @track showLoadingSpinner = false;
    @track error;    

    debug = true;
    @api draftValues = [];
    @track rowSelectedTotals = 0;
    
    filesUploaded = [];
    filename;

    // Accepted File Formats - .CSV files
    get acceptedFormats() {
        return FILE_FORMATS;
    }
 
    // Upload Files Button - It loads the file
    importcsv(event){
        if (event.target.files.length > 0) {
            this.filesUploaded = event.target.files;
            this.filename = event.target.files[0].name;
            if (this.filesUploaded.size > MAX_FILE_SIZE) {
                this.filename = 'File size exceeded';
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error!!',
                        message: 'File size is too large',
                        variant: 'error',
                    }),
                ); 
            } 
        }
    }

    // Import Button
    readFiles() {
        [...this.template
            .querySelector('lightning-input')
            .files].forEach(async file => {
                try {
                    // Read the CSV
                    const result = await this.load(file);
                    this.showLoadingSpinner = false;

                    // Process the CSV to return a JSON
                    this.data = JSON.parse(this.csvJSON(result));

                    // Update OmniScript JSON to include all parsed elements
                    //this.omniUpdateDataJson(this.data);

                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Success!!',
                            message: 'CSV file parsed !!!',
                            variant: 'success',
                        }),
                    );

                } catch(e) {
                    // handle file load exception
                    console.log('exception....' +JSON.stringify(e));
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Error!!',
                            message: JSON.stringify(e),
                            variant: 'error',
                        }),
                    ); 
                }
            });
    }

    // Reads file asynchronously
    async load(file) {
        return new Promise((resolve, reject) => {
            this.showLoadingSpinner = true;
            const reader = new FileReader();

            // Read file into memory as UTF-8
            reader.onload = function() {
                resolve(reader.result);
            };
            reader.onerror = function() {
                reject(reader.error);
            };

            reader.readAsText(file);
        });
    }

     
    //process CSV input to JSON
    csvJSON(csv){

        var lines = csv.split(/\r\n|\n/);
        var result = [];
        var headers = lines[0].split(",");

        // Set up DataTable columns
        headers.forEach((header, i) => {
            let col = { label: header, fieldName: header, editable: true }
            this.columns.push(col);
        });

        // Set up keyField
        this.keyField = headers[0];

        // Iterate over all rows
        for(var i=1; i<lines.length-1; i++) {
            var obj = {};
            var currentline = lines[i].split(",");
            this.rowTotals ++;

            for(var j=0; j<headers.length; j++) {
                obj[headers[j]] = currentline[j];
            }

            result.push(obj);
        }

        // Return result as a formatted JSON
        return JSON.stringify(result);
    }

    /**
     * Handles selection/deselection of rows in the table
     * 
     * @param {*} event The row selection event
     */
     handleRowSelection(event) {

        try {

            let selections = event.detail.selectedRows;
            this.rowSelectedTotals = selections.length;

            if (this.debug) console.log("Row(s) Selected -> " + JSON.stringify(selections));            
            super.omniUpdateDataJson(selections);
        }
        catch (err) {
            console.error("Error in demo_datatable.handleRowSelected() -> " + err);
        }
    }

    /**
     * Handles any inline edit.  The event can contain updates for multiple rows,
     * and each row may have multiple updates.
     * 
     * @param {*} event The inline edit event 
     */
     handleSave(event) {

        try {
        
            let updates = event.detail.draftValues;

            // Track updates for a call to a DataRaptor
            //let drUpdates = [];

            // Handle multiple updates at once
            for (let i=0; i<updates.length; i++) {

                if (this.debug) console.log("Handling Save! -> " + JSON.stringify(updates[i]));

                // Find the row and update accordingly
                for (let x=0; x<this.data.length; x++) {
                    if (this.data[x][this.keyField] == updates[i][this.keyField]) {
                        
                        // Found the Row, make the update(s)
                        for (let key in updates[i]) this.data[x][key] = updates[i][key];

                        // Call the DataRaptor
                        //if (this.updateDataraptor) drUpdates.push(this.data[x]);
                    }
                }
            }

            // Clear the draft values now that we've persisted them
            this.draftValues = [];

            // Call the Update DataRaptor
            //this.dataRaptorUpdates(drUpdates);

            // Make sure any edits are carried over to the OmniScript JSON if the row being edited happens to be selected
            super.omniUpdateDataJson(this.template.querySelector('lightning-datatable').getSelectedRows());
        }
        catch (err) {
            console.error("Error in demo_datatable.handleSave() -> " + err);
        }
    }

    // Super method to validate step in Omniscript
    @api 
    checkValidity() {
        return this.data && this.data.length > 0;
    }

}